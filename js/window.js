var WindowCardView = CardView.extend({
    moreEvents: {
            "click": "onClick"
    },

    initialize: function() {
        this.events = _.extend({}, this.events, this.moreEvents);
        this.delegateEvents();
    },

    points: function() {
        var rank = this.model.get("rank");
        if (parseInt(rank))
            return parseInt(rank);
        else if (rank == "A")
            return 1;
        else
            return null;
    },

    toggleClearable: function(isClearable) {
        this.$el.toggleClass("clearable", isClearable);
    },

    select: function() {
        this.$el.toggleClass("selected", true);
    },

    unselect: function() {
        this.$el.toggleClass("selected", false);
    },

    onClick: function() {
        if (!this.$el.is(".clearable")) return;

        Backbone.trigger("card-selected", this, this.model.get("rank"));
    },

    clear: function() {
        var coords = this.$el.parents(".spot").attr("id");
        var loc = _.map(coords.split(""), function(num){return parseInt(num)});

        this.remove();
        Backbone.trigger("card-cleared", this, loc[0], loc[1]);
    }
});

var WindowBoard = Backbone.View.extend({
    el: $('#Table'),

    events: {
        "click #Grid .spot": "placeCard",
        "click #NewGame": "newGame",
    },

    initialize: function() {
        this.listenTo(Backbone, "card-selected",  this.cardSelected);
        this.listenTo(Backbone, "card-cleared",  this.cardCleared);

        this.deck = null;

        this.emptySpots = 16;

        this.grid = [[], [], [], []];
        this.gridEl = $("#Grid");

        this.nextCard = null;
        this.nextCardEl = $("#NextCard");

        this.newGame();
    },

    render: function() {

    },

    newGame: function() {
        if (this.deck) this.stopListening(this.deck);
        this.deck = Stack.createDeck();

        for (var r = 0; r < 4; r++)
            for (var c = 0; c < 4; c++) {
                var cardView = this.grid[r][c];
                if (cardView) cardView.clear();
                this.grid[r][c] = null;
        }

        this.dealNextCard();
    },

    dealNextCard: function() {
        this.nextCard = this.deck.deal();
        this.nextCard = new WindowCardView({model: this.nextCard});
        this.nextCardEl.html(this.nextCard.render().el);

        // game over?
        var card = this.nextCard.model;
        var rank = card.get("rank");
        var g = this.grid;
        switch (rank) {
            case "J": // jacks
                if (g[1][0] && g[1][3] && g[2][0] && g[2][3]) return this.gameOver();
                break;
            case "Q": // queens
                if (g[0][1] && g[0][2] && g[3][1] && g[3][2]) return this.gameOver();
                break;
            case "K": // kings
                if (g[0][0] && g[0][3] && g[3][0] && g[3][3]) return this.gameOver();
                break;
        }
    },

    placeCard: function(e) {
        // card to play?
        if (!this.nextCard) return;

        var spot = $(e.currentTarget);
        var coords = spot.attr("id");
        var loc = _.map(coords.split(""), function(num){return parseInt(num)});
        var g = this.grid;

        // is spot taken?
        if (g[loc[0]][loc[1]]) return;

        // validate play
        var card = this.nextCard.model;
        var rank = card.get("rank");
        switch (rank) {
            case "J": // jacks
                if (!_.contains(["10", "13", "20", "23"], coords)) return;
                break;
            case "Q": // queens
                if (!_.contains(["01", "02", "31", "32"], coords)) return;
                break;
            case "K": // kings
                if (!_.contains(["00", "03", "30", "33"], coords)) return;
                break;
        }

        // place the card
        this.emptySpots--;
        spot.append(this.nextCard.$el);

        g[loc[0]][loc[1]] = this.nextCard;
        this.nextCard = null;

        // win?
        var jacks = _.every([g[1][0], g[1][3], g[2][0], g[2][3]], function(spot) {
            return spot && spot.model.get("rank") == "J";
        });
        var queens = _.every([g[0][1], g[0][2], g[3][1], g[3][2]], function(spot) {
            return spot && spot.model.get("rank") == "Q";
        });
        var kings = _.every([g[0][0], g[0][3], g[3][0], g[3][3]], function(spot) {
            return spot && spot.model.get("rank") == "K";
        });
        if (jacks && queens && kings) return this.win();

        // the game goes on...
        if (this.emptySpots == 0)
            this.clearTens();
        else
            this.dealNextCard();
    },

    clearTens: function() {
        // mark clearable. if none, game over
        if (this.markClearableCards() == 0) return this.gameOver();
    },

    markClearableCards: function() {

        var present = {0:true};
        var toMark = {};
        _.each(_.flatten(this.grid), function(cardView) {
            var points = cardView && cardView.points();

            if (!points) return;

            if (present[10-points]) {
                toMark[points] = true;
                toMark[10-points] = true;
            } else {
                present[points] = true;
            }
        });

        var count = 0;
        _.each(_.flatten(this.grid), function(cardView) {
            var points = cardView && cardView.points()
            if (!points) return;

            if (toMark[points]) {
                cardView.toggleClearable(true);
                count++;
            } else {
                cardView.toggleClearable(false);
            }
        });

        return count;
    },

    cardSelected: function(cardView, rank) {
        var points = cardView.points();

        if (!this.selectedCard) {
            // no other card selected, select this one
            if (points == 10) { //clear it immediately
                cardView.clear();                        
            } else {
                this.selectedCard = cardView;
                this.selectedCard.select();
            }
        } else if (this.selectedCard == cardView) { 
            // this was already selected, unselect it
            this.selectedCard.unselect();
            this.selectedCard = null;
        } else {
            //make sure other selected card sums to 10
            if (points + this.selectedCard.points() == 10) {
                cardView.clear();
                this.selectedCard.clear();
                this.selectedCard = null;
            }
        }

        // if all clearable cards cleared, start dealing again
        if (this.markClearableCards() == 0) this.dealNextCard();
    },

    cardCleared: function(cardView, row, col) {
        this.grid[row][col] = null;
        this.emptySpots++;
    },

    win: function() {
        alert("you win :)");
    },

    gameOver: function() {
        alert("game over :(");
    }
});

var Card = Backbone.Model.extend({
    toString: function() {
        return "{0}of{1}".format(this.get('rank'), this.get('suit'));
    }

});

var CardView = Backbone.View.extend({
    className: "card",

    render: function() {
        this.$el.text(this.model.toString());
        return this;
    }
});

var Stack = Backbone.Collection.extend({
    model: Card,

    deal: function() {
        return this.pop();
    }
}, {
    createDeck: function(shuffle, count) {
        shuffle = shuffle || true;
        count = count || 1;

        var ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
        var suits = ["C", "D", "H", "S"];

        var cards = [];
        for (var i = 0; i < count; i++)
            for (var s = 0; s < suits.length; s++)
                for (var r = 0; r < ranks.length; r++)
                    cards.push(new Card({rank:ranks[r], suit:suits[s]}));

        if (shuffle)
            cards = _.shuffle(cards);

        return new Stack(cards);
    }    
});


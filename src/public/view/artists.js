class Artists {
    constructor(outlet, model, view, controller) {
        this.outlet = outlet
        this.model = model
        this.view = view
        this.controller = controller
    }

    render({ title, artists }) {

        const collection = this.view.Collection({
            items: artists,
            type: 'artist'
        })

        return [
            createElement('h1', {
                text: title
            }),
            collection
        ]
    }
}

module.exports = Artists
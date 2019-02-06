class Albums {
    constructor(outlet, model, view, controller) {
        this.outlet = outlet
        this.model = model
        this.view = view
        this.controller = controller
    }

    render({ title, albums }) {
        const collection = this.view.Collection({
            items: albums,
            type: 'album'
        })

        return [
            createElement('h1', {
                text: title
            }),
            collection
        ]
    }
}

module.exports = Albums
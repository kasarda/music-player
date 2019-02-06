class Search {
    constructor(outlet, model, view, controller) {
        this.view = view
        this.outlet = outlet
        this.model = model
        this.controller = controller

    }
    renderWillUnmount() {
        this.playlist.removeListeners()
        this.playlist.select.remove()
        this.view.Node.section.onscroll = null
        this.view.Node.search.value = ''
    }

    renderWillMount({ value }) {
        this.view.Node.search.value = value
    }

    render({ value }, name) {

        value = value ? value : ''
        const header = createElement('h1', 'Search ' + value)


        const getSongs = _ => this.model.search(value)

        const { songs, artists, albums } = getSongs()

        this.playlist = this.view.Playlist({
            songs,
            name,
            state: getSongs,
            useFilter: false
        })

        const albumCollection = this.view.Collection({
            items: albums,
            useFilter: false,
            type: 'album'
        })

        const artistsCollection = this.view.Collection({
            items: artists,
            useFilter: false,
            type: 'artist'
        })


        const body = songs.length ? [
            createElement('h2', 'Artists'),
            artistsCollection,
            createElement('h2', 'Albums'),
            albumCollection,
            createElement('h2', 'Songs'),
            this.playlist
        ] : [
                createElement('span.noresult', 'No result')
            ]

        return [
            header,
            ...body
        ]
    }
}

module.exports = Search
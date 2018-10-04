const { createElement } = require('../lib/query')
const ModelPlaylistHandling = require('./handler')
const Collection = require('./collection')

class Search extends ModelPlaylistHandling {
    constructor(...dependencies) {
        super(...dependencies)
    }

    render(state) {
        this.state = state

        // Title
        const title = createElement('h1', {
            text: state.title
        })

        // Playlist
        const songSelect = this.songSelect()
        const playlistTable = this.view.component.Playlist(this.model.loadedSongs, songSelect)
        this.nodes.playlistTable = playlistTable

        this.setActiveRow()

        this.controller.audio.addEventListener('play', _ => {
            this.setActiveRow()
        })


        // Artists
        const artistItems = Collection.getItems.call(this, this.model.artists, false, 'artists')
        const artists = this.view.component.Grid(artistItems)

        // Albums
        const albumItems = Collection.getItems.call(this, this.model.albums, true, 'albums')
        const albums = this.view.component.Grid(albumItems)

        // Filter
        albums.filter(state.title)
        artists.filter(state.title)
        playlistTable.filter(state.title)

        // Register Events
        this.registerEvents()

        return createElement('.search', {
            child: [
                createElement('header', {
                    child: createElement('.content', {
                        child: title
                    })
                }),
                createElement('.name', { text: 'Songs' }),
                playlistTable,
                createElement('.name', { text: 'Artists' }),
                artists,
                createElement('.name', { text: 'Albums' }),
                albums
            ]
        })
    }
}


module.exports = Search
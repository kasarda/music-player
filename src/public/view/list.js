const { createElement } = require('../lib/query')
const { Event, Component } = require('../lib/common')

class List {
    constructor(outlet, main, model, view) {
        this.main = main
        this.model = model
        this.view = view
        this.nodes = {}
    }

    get items() {
        return this.view.node.custom
    }

    renderPlaylist(playlistID) {
        this.view.render(Component.PLAYLIST, playlistID)
    }

    renderWillUnmount() {
        this.model.removeAllEventListeners('list')
    }

    modelAddPlaylist(err, playlist) {
        if(!err) {
            const item = createElement('li', {
                text: playlist.name,
                data: {
                    id: playlist.id
                },
                on: {
                    click: this.renderPlaylist.bind(this, playlist.id)
                }
            })

            this.nodes.list.appendChild(item)
        }
    }

    modelRenamePlaylist(err, playlist) {
        if(!err) {
            this.items.forEach(item => {
                if (item.dataset.id === playlist.id)
                    item.innerText = playlist.name
            })
        }
    }

    modelRemovePlaylist(err, playlist) {
        if(!err) {
            this.items.forEach(item => {
                if(item.dataset.id === playlist.id)
                    item.remove()
            })
        }
    }

    render(state) {
        const items = state.playlists.map(playlist => {
            return createElement('li', {
                text: playlist.name,
                data: {
                    id: playlist.id
                },
                on: {
                    click: this.renderPlaylist.bind(this, playlist.id)
                }
            })
        })

        const list = createElement('ul', {
            child: items
        })

        this.nodes.list = list

        this.model.addEventListener(Event.ADD_PLAYLIST, this.modelAddPlaylist.bind(this), 'list')
        this.model.addEventListener(Event.REMOVE_PLAYLIST, this.modelRemovePlaylist.bind(this), 'list')
        this.model.addEventListener(Event.RENAME_PLAYLIST, this.modelRenamePlaylist.bind(this), 'list')

        return list
    }
}

module.exports = List
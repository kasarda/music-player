const { createElement } = require('../lib/query')

class Welcome {
    constructor(outlet, model, view) {
        this.outlet = outlet
        this.model = model
        this.view = view
    }

    onAddPlaylist() {
        this.view.createPlaylist()
    }

    onAddSong() {
        this.view.addSong()
    }

    render() {
        const createPlaylist = createElement('button', {
            text: 'Create playlist',
            on: {
                click: this.onAddPlaylist.bind(this)
            }
        })

        const addSong = createElement('button', {
            text: 'Add songs',
            on: {
                click: this.onAddSong.bind(this)
            }
        })

        return createElement('.welcome', {
            child: [
                createElement('h1', { text: 'Welcome' }),
                createElement('p', { text: 'Lorem ipsum dolor, sit amet consectetur adipisicing elit.' }),
                createElement('.button-group', {
                    child: [
                        createPlaylist,
                        addSong
                    ]
                })
            ]
        })
    }
}

module.exports = Welcome
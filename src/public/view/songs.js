const { Ev, createElement, toTimeString, createIcon, Icon, Key, toPlural, Render } = require('../lib/common')

class Songs {
    constructor(outlet, model, view, controller) {
        this.outlet = outlet
        this.model = model
        this.view = view
        this.controller = controller

        this.model.on(Ev.RENAME_PLAYLIST, (_, name) => {
            this.heading.innerText = name
        }, 'songs')

        this.model.on(Ev.REMOVE_PLAYLIST, ({ id }) => {
            if (id === outlet.state.id) {
                if (!outlet.history.isFirst)
                    outlet.history.back()
                else
                    outlet.render(Render.MUSIC)
            }
        }, 'songs')
    }

    renderWillUnmount() {
        this.playlist.removeListeners()
        this.playlist.select.remove()
        this.view.Node.section.onscroll = null
        window.onresize = null
        this.model.removeAllEventListeners('songs')
    }

    render({ title, id, songs, useFolder, useFilter, type, collection }, name) {
        this.heading = createElement('h1', {
            text: title || ''
        })

        this.playlist = this.view.Playlist({
            songs,
            name,
            state: this.outlet.originalState,
            useFilter
        })


        const playlistButtons = type === 'playlist' ? [
            createElement('button', {
                text: 'Rename',
                ontrigger: _ => this.view.renamePlaylist(id)
            }),
            createElement('button', {
                text: 'Remove',
                ontrigger: _ => this.view.removePlaylist(id)
            })
        ] : []

        const body = [
            useFolder ? createElement('.folder', {
                child: [
                    createElement('span', 'Add some music'),
                    createIcon(Icon.ADD)
                ],
                on: {
                    click: _ => this.view.addFolder()
                }
            }) : null,

            name === Key.NOW_PLAYING ? null : createElement('button', {
                text: 'Play',
                ontrigger: _ => this.playlist._toggle()
            }),
            [Key.MUSIC, Key.NOW_PLAYING].includes(name) ? null : createElement('button', {
                text: 'Play next',
                ontrigger: _ => this.controller.playNext(songs, name)
            }),
            ...playlistButtons,
            this.playlist
        ]

        if (type === 'album') {
            return [createElement('.preview', [
                createElement('.cover', [
                    createElement('img', {
                        src: collection.cover,
                        on: {
                            error() {
                                this.remove()
                            }
                        }
                    }, collection.cover)
                ]),
                createElement('.info', [
                    createElement('h1', {
                        text: collection.name || 'Unknown'
                    }),
                    createElement('article', [
                        collection.artist ? createElement('span.artist', {
                            text: collection.artist,
                            on: {
                                click: _ => {
                                    this.outlet.render(Render.ARTIST(collection.artist), collection.artist)
                                }
                            }
                        }) : null,
                        createElement('.meta', {
                            text: `${collection.year ? collection.year + ' • ' : ''} ${toPlural(collection.songs.length, 'song')} ${collection.duration ? toTimeString(collection.duration) : ''}`
                        })
                    ])
                ])
            ]), ...body]
        }
        else if (type === 'artist') {
            const header = createElement('.preview', [
                createElement('.cover.rounded'),
                createElement('.info', [
                    createElement('h1', {
                        text: collection.name || 'Unknown'
                    }),
                    createElement('article', {
                        text: `${toPlural(collection.albums.length, 'album')} ${toPlural(collection.singels.length, 'single')}`
                    })
                ])
            ])

            const albumCollection = this.view.Collection({
                items: collection.albums.map(album => this.model.getAlbum(album.name, album.albumartist)).filter(a => a),
                useFilter: false,
                type: 'album'
            })
            const album = collection.albums.length ? [
                createElement('h2', 'Albums'),
                albumCollection
            ] : []

            const playlist = songs.length ? [
                createElement('h2', 'Singles'),
                this.playlist
            ] : []

            return [
                header,
                createElement('button', {
                    text: 'Play',
                    ontrigger: _ => {
                        if (collection.albums.length)
                            albumCollection._playItem(collection)
                        else
                            this.playlist.play()
                    }
                }),
                createElement('button', {
                    text: 'Play next',
                    ontrigger: _ => this.controller.playNext(collection.songs, name)
                }),
                ...album,
                ...playlist
            ]
        }


        return [
            this.heading,
            ...body
        ]
    }
}


module.exports = Songs
const { createElement } = require('../lib/query')
const { toTimeString } = require('../lib/common')
const ModelPlaylistHandling = require('./handler')

class Playlist extends ModelPlaylistHandling {
    constructor(...dependencies) {
        super(...dependencies)
    }

    onAddSong() {
        this.view.addSong()
    }

    onAttachToPlaylist() {
        this.view.attachToPlaylist(this.state.playlistID)
    }

    onRenamePlaylist() {
        this.view.renamePlaylist(this.state.playlistID)
    }

    onRemovePlaylist() {
        this.view.removePlaylist(this.state.playlistID)
    }


    render(state) {
        this.state = state

        // Title
        const title = createElement('h1', {
            text: state.title
        })
        this.nodes.title = title



        // Metadata
        let totalDuration = 0

        state.songs.forEach(song => {
            if (song.metadata.duration)
                totalDuration += song.metadata.duration
        })

        const length = state.songs.length
        const duration = totalDuration

        const metadata = createElement('span', {
            text: `${length} Songs, ${toTimeString(duration)}`
        })

        this.props.length = length
        this.props.duration = duration
        this.nodes.metadata = metadata



        // Select
        let select = null
        if (state.select) {
            select = this.view.component.Select([
                {
                    text: 'Add song',
                    action: this.onAttachToPlaylist.bind(this)
                },
                {
                    text: 'Rename',
                    action: this.onRenamePlaylist.bind(this)
                },
                {
                    text: 'Remove',
                    action: this.onRemovePlaylist.bind(this)
                }
            ])
        }




        // Playlist table
        const songSelect = this.songSelect()
        const playlistTable = this.view.component.Playlist(state.songs, songSelect)
        this.nodes.playlistTable = playlistTable
        this.setActiveRow()


        // Filter
        const filter = createElement('input', {
            prop: {
                placeholder: 'Filter'
            },
            on: {
                input: _ => {
                    if (this.controller.isActivePlaylist(this.state.renderer))
                        this.controller.filter(filter.value, 'input')
                    else {
                        this.filterText = filter.value
                        playlistTable.filter(filter.value)
                    }
                }
            }
        })

        this.nodes.filter = filter




        // Buttons
        let addSong = null
        if (state.addSong) {
            addSong = createElement('button', {
                text: 'Add song',
                on: {
                    click: state.addGeneralSong ? this.onAddSong.bind(this) : this.onAttachToPlaylist.bind(this)
                }
            })
        }


        let playState = 'Play'

        if (this.controller.isActivePlaylist(state.renderer)) {
            if (this.controller.isPaused)
                playState = 'Play'
            else
                playState = 'Pause'
        }
        else {
            playState = 'Play'
        }

        const play = createElement('button', {
            text: playState,
            on: {
                click: _ => {
                    if (this.controller.hasSrc && this.controller.isActivePlaylist(state.renderer))
                        this.controller.toogle()
                    else
                        this.playSong()
                }
            }
        })

        this.nodes.play = play


        // Register Events
        this.registerEvents()


        // Default filter

        if (this.controller.filterText && this.controller.isActivePlaylist(state.renderer)) {
            filter.value = this.controller.filterText
            this.controller.filter(this.controller.filterText)
        }

        return createElement('.playlist', {
            child: [
                createElement('header', {
                    child: [
                        createElement('.content', {
                            child: [
                                title,
                                metadata
                            ]
                        }),
                        createElement('.button-group', {
                            child: [
                                addSong,
                                play
                            ]
                        }),
                        select
                    ]
                }),
                createElement('.filter', {
                    child: filter
                }),
                playlistTable
            ]
        })
    }
}


module.exports = Playlist
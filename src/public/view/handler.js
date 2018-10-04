const { Event, toTimeString, Component, Render, include } = require('../lib/common')

class ModelPlaylistHandling {
    constructor(outlet, model, view, controller) {
        this.outlet = outlet
        this.state = outlet.state
        this.model = model
        this.view = view
        this.controller = controller
        this.nodes = {}
        this.props = {}
    }

    overrideQueue() {
        console.log('OVERRIDE', this.filterText, this.controller.filterText)

        this.controller
            .queue(this.state.songs, this.state.renderer)

        if (this.filterText)
            this.controller.filter(this.filterText)
        return this.controller
    }

    playSong(id) {
        this.overrideQueue().play(id)
    }

    songSelect() {
        return [
            {
                text: ({ data }) => {
                    if (
                        this.controller.current === data.id &&
                        !this.controller.audio.paused &&
                        this.controller.isActivePlaylist(this.state.renderer)
                    )
                        return 'Pause'
                    return 'Play'
                },
                action: ({ data }) => {
                    if (
                        this.controller.current === data.id &&
                        this.controller.isActivePlaylist(this.state.renderer)
                    ) {
                        if (this.controller.audio.paused)
                            this.controller.audio.play()
                        else
                            this.controller.audio.pause()
                    }
                    else {
                        this.playSong(data.id)
                    }
                }
            },

            {
                text({ data }) {
                    if (data.fav)
                        return 'Remove from favorite'
                    return 'Add to favorite'
                },
                action: ({ data }) => {
                    if (!data.fav) {
                        this.model.addFav(data.id)
                    }
                    else {
                        this.model.removeFav(data.id)
                    }
                }
            },
            {
                text: 'Add to playlist',
                disabled: _ => {
                    return !this.model.playlists.length
                },
                sub: _ => {
                    return this.model.playlists.map(playlist => {
                        return {
                            text: playlist.name,
                            disabled: ({ data }) => {
                                return playlist.songs.includes(data.id)
                            },
                            action: ({ data }) => {
                                this.model.addSongToPlaylist(playlist.id, data.id)
                            }
                        }
                    })
                }
            },
            {
                create: this.state.removeFromPlaylist ? true : false,
                text: 'Remove from playlist',
                action: ({ data }) => {
                    this.model.removeSongFromPlaylist(this.state.playlistID, data.id)
                }
            },
            {
                text: 'Remove',
                action: ({ data }) => {
                    this.model.removeSong(data.id)
                }
            }
        ]
    }

    _updateMetadata(increase, duration) {
        if (this.nodes.metadata) {
            this.props.length = this.props.length + increase
            this.props.duration = this.props.duration + duration
            this.nodes.metadata.innerText = `${this.props.length} Songs, ${toTimeString(this.props.duration)}`
        }
    }

    setActiveRow() {
        this.nodes.playlistTable._bodyRows.forEach(row => {
            if (
                (row.dataset.id === this.controller.current) &&
                (this.controller.isActivePlaylist(this.state.renderer))
            )
                row.classList.add('active')
            else
                row.classList.remove('active')
        })
    }

    modelRenamePlaylist(err, playlist) {
        if (!err) {
            if (this.state.playlistID === playlist.id) {
                this.nodes.title.innerText = playlist.name
            }
        }
    }

    modelRemovePlaylist(err, playlist) {
        if (!err) {
            if (this.state.playlistID === playlist.id) {
                this.outlet.render(Component.WELCOME)
            }
        }
    }


    modelAddSongToPlaylist(err, playlist, song) {
        if (!err) {
            if (this.state.playlistID === playlist.id) {
                this.nodes.playlistTable.addSong(song, false)
                this._updateMetadata(1, song.metadata.duration)
            }
        }
    }

    modelRemoveSongFromPlaylist(err, playlist, song) {
        if (!err) {
            if (this.state.playlistID === playlist.id) {
                this.nodes.playlistTable.removeSong(song.id)
                this._updateMetadata(-1, -(song.metadata.duration))
            }
        }
    }

    modelAddSong(err, song) {
        if (!err) {
            if (include(this.state.type, Render.SONGS, Render.MOST_PLAYED)) {
                this.nodes.playlistTable.addSong(song)
                this._updateMetadata(1, song.metadata.duration)
            }
        }
    }

    modelRemoveSong(err, song) {
        if (!err) {
            this.nodes.playlistTable._songs.forEach(playlist_song => {
                if (playlist_song.id === song.id) {
                    this.nodes.playlistTable.removeSong(song.id)
                    this._updateMetadata(-1, -(song.metadata.duration))
                }
            })
        }
    }

    modelAddFavSong(err, song) {
        if (!err) {
            const playlist_song = this.nodes.playlistTable.getSong(song.id)
            if (playlist_song && !playlist_song.fav) {

                const songHasPlaylist = song.playlists.includes(this.state.playlistID)

                if ((this.state.type === Render.CUSTOM && songHasPlaylist) || this.state.type !== Render.CUSTOM) {
                    this.nodes.playlistTable.addFav(song.id, false)
                }
            }
            if (this.state.type === Render.FAV && !playlist_song) {
                this.nodes.playlistTable.addSong(song)
                this._updateMetadata(1, song.metadata.duration)
            }
        }
    }


    modelRemoveFavSong(err, song) {
        if (!err) {
            const playlist_song = this.nodes.playlistTable.getSong(song.id)
            if (playlist_song && playlist_song.fav) {
                const songHasPlaylist = song.playlists.includes(this.state.playlistID)

                if ((this.state.type === Render.CUSTOM && songHasPlaylist) || this.state.type !== Render.CUSTOM) {
                    this.nodes.playlistTable.removeFav(song.id, false)
                }
            }

            if (this.state.type === Render.FAV && playlist_song) {
                this.nodes.playlistTable.removeSong(song.id)
                this._updateMetadata(-1, -(song.metadata.duration))
            }
        }
    }

    onAudioPlay() {
        if (this.controller.isActivePlaylist(this.state.renderer) && this.nodes.play) {
            this.nodes.play.innerText = 'Pause'
        }
    }

    onAudioCanPlay() {
        this.setActiveRow()
    }

    onAudioPause() {
        if (this.controller.isActivePlaylist(this.state.renderer) && this.nodes.play)
            this.nodes.play.innerText = 'Play'
    }

    registerEvents() {
        this.nodes.playlistTable.addEventListener(Event.ADD_FAV, ({ detail }) => {
            this.model.addFav(detail.id)
        })

        this.nodes.playlistTable.addEventListener(Event.REMOVE_FAV, ({ detail }) => {
            this.model.removeFav(detail.id)
        })

        this.nodes.playlistTable.addEventListener(Event.ROW_CLICK, ({ detail }) => {
            this.playSong(detail.id)
        })

        this.nodes.playlistTable.addEventListener(Event.CHANGE, ({ detail }) => {
            if (this.controller.isActivePlaylist(this.state.renderer))
                this.overrideQueue()
        })

        this.controller.addEventListener(Event.FILTER, (err, text, type) => {
            if (this.controller.isActivePlaylist(this.state.renderer)) {
                this.nodes.playlistTable.filter(text)
                this.filterText = text
                if (type !== 'input' && this.nodes.filter)
                    this.nodes.filter.value = text
                console.log('FILTER EVENT')
            }
        }, 'playlist')

        this.model.addEventListener(Event.REMOVE_PLAYLIST, this.modelRemovePlaylist.bind(this), 'playlist')
        this.model.addEventListener(Event.RENAME_PLAYLIST, this.modelRenamePlaylist.bind(this), 'playlist')
        this.model.addEventListener(Event.ADD_SONG_TO_PLAYLIST, this.modelAddSongToPlaylist.bind(this), 'playlist')
        this.model.addEventListener(Event.REMOVE_SONG_FROM_PLAYLIST, this.modelRemoveSongFromPlaylist.bind(this), 'playlist')
        this.model.addEventListener(Event.ADD_METADATA, this.modelAddSong.bind(this), 'playlist')
        this.model.addEventListener(Event.REMOVE_SONG, this.modelRemoveSong.bind(this), 'playlist')
        this.model.addEventListener(Event.ADD_FAV, this.modelAddFavSong.bind(this), 'playlist')
        this.model.addEventListener(Event.REMOVE_FAV, this.modelRemoveFavSong.bind(this), 'playlist')

        this.controller.addEventListener('play', this.onAudioPlay.bind(this), 'playlist')
        this.controller.addEventListener('pause', this.onAudioPause.bind(this), 'playlist')
        this.controller.addEventListener('canplay', this.onAudioCanPlay.bind(this), 'playlist')
    }

    renderWillUnmount() {
        this.model.removeAllEventListeners('playlist')
        this.controller.removeAllEventListeners('playlist')
    }
}

module.exports = ModelPlaylistHandling
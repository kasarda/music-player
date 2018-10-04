const Register = require('../component/register')
const { createElement } = require('../lib/query')
const { getImmutable, Render, Component } = require('../lib/common')

const nodes = {
    aside: document.querySelector('main > aside'),
    section: document.querySelector('main > section'),
    footer: document.querySelector('main > footer'),
    search: document.querySelector('#search'),
    options: document.querySelector('#options'),
    poster: document.querySelector('#poster'),
    get playlist() {
        return document.querySelectorAll('[data-playlist]')
    },
    get collection() {
        return document.querySelectorAll('[data-collection]')
    },
    get action() {
        return document.querySelectorAll('[data-action]')
    },
    get items() {
        return document.querySelectorAll('aside .content li')
    },
    get custom() {
        return document.querySelectorAll('aside .content outlet-component li[data-id]')
    }
}

const modals = {
    get createPlaylist() {
        return Register.Modal({
            title: 'Create playlist',
            content: [
                {
                    role: 'input',
                    label: 'Name: ',
                    name: 'name',
                    prop: {
                        required: true,
                        minLength: 3
                    }
                }
            ]
        })
    },
    get renamePlaylist() {
        return Register.Modal({
            title: 'Rename playlist',
            content: [
                {
                    role: 'input',
                    label: 'New name: ',
                    name: 'name',
                    prop: {
                        required: true,
                        minLength: 3
                    }
                }
            ]
        })
    },
    get removePlaylist() {
        return Register.Modal({
            title: 'Are you sure you want to remove this playlist?',
        })
    }
}

class View {
    constructor(model, controller) {
        this.model = model
        this.controller = controller
        this.outlet
    }

    reverse(songs) {
        return getImmutable(songs, true).reverse()
    }

    get component() {
        return Register
    }

    get node() {
        return nodes
    }

    get modal() {
        return modals
    }

    get state() {
        return {
            playlist: {
                songs: () => ({
                    title: 'Songs',
                    select: false,
                    addSong: true,
                    addGeneralSong: true,
                    songs: this.reverse(this.model.loadedSongs),
                    type: Render.SONGS,
                    renderer: {
                        component: Component.PLAYLIST,
                        type: Render.SONGS
                    }
                }),
                fav: () => ({
                    title: 'Favorite',
                    select: false,
                    addSong: false,
                    songs: this.reverse(this.model.fav),
                    type: Render.FAV,
                    renderer: {
                        component: Component.PLAYLIST,
                        type: Render.FAV
                    }
                }),
                recents: () => ({
                    title: 'Recents',
                    select: false,
                    addSong: false,
                    songs: this.reverse(this.model.recents),
                    type: Render.RECENTS,
                    renderer: {
                        component: Component.PLAYLIST,
                        type: Render.RECENTS
                    }
                }),
                mostPlayed: () => ({
                    title: 'Most played',
                    select: false,
                    addSong: false,
                    songs: this.model.mostPlayed,
                    type: Render.MOST_PLAYED,
                    renderer: {
                        component: Component.PLAYLIST,
                        type: Render.MOST_PLAYED
                    }
                }),
                custom: playlistID => {
                    const playlist = this.model.getPlaylistWithSongs(playlistID)

                    if (playlist) {
                        const { name, id, songs } = playlist
                        return {
                            title: name,
                            select: true,
                            addSong: true,
                            playlistID: id,
                            songs,
                            removeFromPlaylist: true,
                            type: Render.CUSTOM,
                            renderer: {
                                component: Component.PLAYLIST,
                                type: id
                            }
                        }
                    }
                    return {}
                },
                collection: (title, collectionType, songs) => ({
                    title,
                    songs,
                    collectionType,
                    type: Render.COLLECTION,
                    renderer: {
                        component: Component.PLAYLIST,
                        type: collectionType,
                        prop: title
                    }
                }),
                unknown: (collectionType, songs) => ({
                    title: 'Others',
                    songs,
                    collectionType,
                    type: Render.COLLECTION,
                    renderer: {
                        component: Component.PLAYLIST,
                        type: collectionType,
                        prop: true
                    }
                })
            },
            collection: {
                albums: () => ({
                    title: 'Albums',
                    useGridTitle: true,
                    collection: this.model.albums,
                    type: Render.ALBUMS,
                    renderer: {
                        component: Component.COLLECTION,
                        type: Render.ALBUMS
                    }
                }),
                artists: () => ({
                    title: 'Artists',
                    useGridTitle: false,
                    collection: this.model.artists,
                    type: Render.ARTISTS,
                    renderer: {
                        component: Component.COLLECTION,
                        type: Render.ARTISTS
                    }
                })
            },
            search: title => ({
                title,
                type: Render.SEARCH,
                renderer: {
                    component: Component.SEARCH,
                    type: title,
                }
            }),
            welcome: () => ({
                type: Render.WELCOME,
                renderer: {
                    component: Component.WELCOME,
                }
            })
        }
    }

    getFiles() {
        const input = createElement('input', {
            prop: {
                type: 'file',
                multiple: true,
                accept: 'audio/*'
            }
        })

        input.click()
        return new Promise(resolve => {
            input.addEventListener('change', _ => {
                const files = []
                for (const file of input.files)
                    files.push(file.path)

                resolve(files)
            })
        })
    }

    createPlaylist() {
        const modal = this.modal.createPlaylist

        modal.addEventListener('confirm', event => {
            this.model.addPlaylist(event.detail.name)
        })

        modal.open()
        document.body.appendChild(modal)
    }

    renamePlaylist(playlistID) {
        const modal = this.modal.renamePlaylist
        modal.addEventListener('confirm', event => {
            this.model.renamePlaylist(playlistID, event.detail.name)
        })

        modal.open()
        document.body.appendChild(modal)
    }

    removePlaylist(playlistID) {
        const modal = this.modal.removePlaylist
        modal.addEventListener('confirm', _ => {
            this.model.removePlaylist(playlistID)
        })

        modal.open()
        document.body.appendChild(modal)
    }

    async addSong() {
        const files = await this.getFiles()
        files.forEach(file => {
            model.addSong(file).then(_ => {
                if (this.outlet) {
                    if (this.outlet.channel === Component.WELCOME)
                        this.render(Component.PLAYLIST, Render.SONGS)
                }
            })
        })
    }

    async attachToPlaylist(playlistID) {
        const files = await this.getFiles()
        files.forEach(file => {
            this.model.attachToPlaylist(file, playlistID)
        })
    }

    getState({
        component,
        type,
        prop
    } = this.controller.renderer) {

        switch (component) {
            case Component.PLAYLIST:
                switch (type) {
                    case Render.ALBUMS:
                        if (prop === true)
                            return this.state.playlist.unknown(type, this.model.albums.unknown)
                        else
                            return this.state.playlist.collection(prop, type, this.model.albums.props[prop].songs)
                    case Render.ARTISTS:
                        if (prop === true)
                            return this.state.playlist.unknown(type, this.model.artists.unknown)
                        else
                            return this.state.playlist.collection(prop, type, this.model.artists.props[prop].songs)
                    case Render.SONGS:
                        return this.state.playlist.songs()

                    case Render.FAV:
                        return this.state.playlist.fav()

                    case Render.RECENTS:
                        return this.state.playlist.recents()

                    case Render.MOST_PLAYED:
                        return this.state.playlist.mostPlayed()

                    default:
                        return this.state.playlist.custom(type)
                }

            case Component.COLLECTION:
                switch (type) {
                    case Render.ALBUMS:
                        return this.state.collection.albums()

                    case Render.ARTISTS:
                        return this.state.collection.artists()
                }
                break

            case Component.SEARCH:
                return this.state.search(type)

            case Component.WELCOME:
                return this.state.welcome()

            default:
                return {}
        }
    }

    render(component, type, prop) {
        const state = this.getState({
            component,
            type,
            prop
        })

        this.outlet.render(component, state)
    }
}

module.exports = View

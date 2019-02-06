const History = require('../lib/history')
const { Render } = require('../lib/common')
const View = require('../core/view')

class Outlet extends HTMLElement {
    constructor(options, section, model, controller) {
        super()
        this._state
        this._channel
        this._template
        this._key
        this._location
        this._originalState
        this.component = options.component || {}
        this.dependencies = options.dependencies || []
        this._section = section
        this._event = {
            render: [],
            willMount: [],
            didMount: [],
            willUnmount: [],
            error: []
        }
        this.model = model
        this.controller = controller
        this.data = []

        this.State = {
            search: value => _ => ({
                value
            }),
            music: _ => ({
                title: 'Music',
                songs: this.model.songs,
                useFilter: true,
                useFolder: true
            }),
            fav: _ => ({
                title: 'Favorite',
                songs: this.model.getSongsByIDs(this.model.favs)
            }),
            albums: _ => ({
                title: 'Albums',
                albums: this.model.albums
            }),
            artists: _ => ({
                title: 'Artists',
                artists: this.model.artists
            }),
            album: (album, artist) => _ => {
                const item = this.model.getAlbum(album, artist)
                if(item) {
                    return {
                        title: item.name,
                        songs: this.model.getSongsByIDs(item.songs),
                        collection: item,
                        type: 'album'
                    }
                }

                return null
            },
            artist: artist => _ => {
                const item = this.model.getArtist(artist)
                if (item) {
                    return {
                        title: item.name,
                        songs: this.model.getSongsByIDs(item.singels),
                        collection: item,
                        type: 'artist'
                    }
                }
                return null
            },
            nowPlaying: _ => ({
                title: 'Now playing',
                songs: this.model.getSongsByIDs(this.controller.filteredQueueIDs)
            }),
            recents: _ => ({
                title: 'Recents',
                songs: this.model.getSongsByIDs(this.model.recents)
            }),
            mostPlayed: _ => ({
                title: 'Most played',
                songs: this.model.mostPlayed
            }),
            playlist: id => _ => {
                const playlist = this.model.getPlaylistByID(id)
                if(playlist) {
                    return {
                        title: playlist.name,
                        songs: this.model.getSongsByIDs(playlist.songs),
                        useFilter: true,
                        type: 'playlist',
                        id
                    }
                }
                return null
            },
            settings: _ => ({}),
            about: _ => ({})
        }


        this.history = new History()

        this.history.onChange(([location, state, top]) => {
            this.setState(location, state, true)
            if (top)
                this._section.scrollTop = top
        })

        this.history.beforeChange(historyState => {
            if (historyState)
                historyState[2] = this._top
        })
    }

    get state() {
        return this._state
    }

    get channel() {
        return this._channel
    }

    get location() {
        return this._location
    }

    get key() {
        return this._key
    }

    get originalState() {
        return this._originalState
    }

    render(type, ...value) {
        let state
        switch (type) {
            case Render.MUSIC:
                state = this.State.music
                break
            case Render.FAV:
                state = this.State.fav
                break
            case Render.NOW_PLAYING:
                state = this.State.nowPlaying
                break
            case Render.RECENTS:
                state = this.State.recents
                break
            case Render.MOST_PLAYED:
                state = this.State.mostPlayed
                break
            case Render.ALBUMS:
                state = this.State.albums
                break
            case Render.ARTISTS:
                state = this.State.artists
                break
            case Render.SETTINGS:
                state = this.State.settings
                break
            case Render.ABOUT:
                state = this.State.about
                break
            case Render.SEARCH:
                state = this.State.search(...value)
                break
            case Render.ARTIST(...value):
                state = this.State.artist(...value)
                break
            case Render.ALBUM(...value):
                state = this.State.album(...value)
                break
            case Render.PLAYLIST(...value):
                state = this.State.playlist(...value)
                break
        }

        const isValid = typeof state === 'function' ? state() : false

        if (state && isValid)
            this.setState(type, state, false, value)
        else {
            this._event.error.forEach(cb => cb.call(this))
        }

    }

    setState(type, state, ignorePush = false, value = []) {
        try {
            this._top = this._section.scrollTop

            const index = type.indexOf('.')
            const location = [type.slice(0, index), type.slice(index + 1)]

            const channel = location[0]
            const key = location[1]

            const template = this.component[channel]

            const stateObject = typeof state === 'function' ? state() : state

            if (template) {

                if (this._template) {
                    if ('renderWillUnmount' in this._template)
                        this._template.renderWillUnmount(this._state)
                    this._event.willUnmount.forEach(cb => cb.call(this, this._state))
                }

                this._state = stateObject
                this._originalState = state
                this._channel = channel
                this._key = key
                this._location = location.join('.')
                const constructor = new template(this, ...this.dependencies)
                this._template = constructor
                this.innerHTML = ''

                if ('renderWillMount' in constructor)
                    constructor.renderWillMount(this._state)
                this._event.willMount.forEach(cb => cb.call(this, this._state))

                let content = constructor.render(this._state, key)
                this._event.render.forEach(cb => cb.call(this, this._state))

                if (content instanceof Array) {
                    content
                        .map(elem => ['string', 'number'].includes(typeof elem) ? new Text(elem) : elem)
                        .filter(elem => elem instanceof Node)
                        .forEach(elem => this.appendChild(elem))
                }
                else {
                    if (['string', 'number'].includes(typeof content))
                        content = new Text(content)

                    if (content instanceof Node)
                        this.appendChild(content)
                }

                if ('renderDidMount' in constructor)
                    constructor.renderDidMount(this._state)
                this._event.didMount.forEach(cb => cb.call(this, this._state))

                if (!ignorePush) {
                    this.history.push(location.join('.'), state)
                }
            }
            else {
                throw new TypeError('CHANNEL IS NOT DEFINE')
            }
            this.data = [type, ...value]
        }
        catch (err) {
            console.warn(err)
            this._event.error.forEach(cb => cb.call(this, err))
        }
    }

    reload() {
        this.setState(this._channel, this._state)
    }

    onRender(cb) {
        this._event.render.push(cb)
    }

    onError(cb) {
        this._event.error.push(cb)
    }

    onWillMount(cb) {
        this._event.willMount.push(cb)
    }

    onDidMount(cb) {
        this._event.didMount.push(cb)
    }

    onWillUnmount(cb) {
        this._event.willUnmount.push(cb)
    }
}

customElements.define('outlet-component', Outlet)
module.exports = Outlet
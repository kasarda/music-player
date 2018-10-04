const path = require('path')
const fs = require('fs')
const util = require('util')
const crypto = require('crypto')

const Database = require('node-json-db')
const getMetadata = require('music-metadata')
const mimeType = require('mime-types')

const EventListener = require('../lib/event')
const { Event, Err, getImmutable } = require('../lib/common')

const file = {
    write: util.promisify(fs.writeFile),
    remove: util.promisify(fs.unlink)
}


class Model extends EventListener {
    constructor() {
        super()
        const file = path.join(__dirname, '../../database/db.json')
        this.db = new Database(file, true, true)
        this.warnings = true

        // audio for testing
        this.audio = new Audio
    }

    get data() {
        return this.db.getData('/')
    }

    get songs() {
        return this.db.getData('/songs')
    }

    get loadedSongs() {
        return this.db.getData('/songs')
            .filter(song => Object.values(song.metadata).length)
    }

    get playlists() {
        return this.db.getData('/playlists')
    }

    get fav() {
        const favs = Object.assign([], this.favIDs)
        return favs.map(id => this.getSong(id)).reverse()
    }

    get favIDs() {
        return this.db.getData('/fav')
    }

    get albums() {
        return this._getSongGroup(song => song.metadata.album)
    }

    get artists() {
        return this._getSongGroup(song => song.metadata.artist || (song.metadata.artists || []).join(',') || song.metadata.albumartist)
    }

    get recents() {
        return this.recentIDs.map(id => this.getSong(id))
    }

    get recentIDs() {
        return this.db.getData('/recents')
    }

    get mostPlayed() {
        const songs = Object.assign([], this.songs)
        return songs.sort((a, b) => b.played - a.played)
    }

    get settings() {
        return this.db.getData('/settings')
    }

    get def() {
        return this.db.getData('/def')
    }

    setDef(defs) {
        for (const prop in defs) {
            const value = defs[prop]
            this.db.push(`/def/${prop}`, value)
        }
    }

    addPlaylist(name) {
        name = name.toString()
        if (name.length > 2) {
            const id = this._generateID()
            const playlist = {
                name,
                id,
                songs: []
            }
            this.db.push('/playlists[]', playlist)
            this.dispatchEvent(Event.ADD_PLAYLIST, playlist)
            return id
        }
        else {
            this.dispatchError(Event.ADD_PLAYLIST, Err.INVALID_NAME, name)
            this._warning('add playlist => ' + Err.INVALID_NAME)
        }
        return null
    }

    removePlaylist(id) {
        const playlist = this.updatePlaylist(id, null)

        this.songs.forEach((song, index) => {
            if (song.playlists && song.playlists.includes(id)) {
                song.playlists.forEach((playlistID, pos) => {
                    if (playlistID === id)
                        this.db.delete(`/songs[${index}]/playlists[${pos}]`)
                })
            }
        })

        if (playlist) {
            this.dispatchEvent(Event.REMOVE_PLAYLIST, playlist)
        }
        else {
            this.dispatchError(Event.REMOVE_PLAYLIST, Err.PLAYLIST_NOT_FOUND, id)
            this._warning('Remove Playlist => ' + Err.PLAYLIST_NOT_FOUND)
        }
    }

    renamePlaylist(id, name) {
        const playlist = this.updatePlaylist(id, { name })

        if (playlist) {
            this.dispatchEvent(Event.RENAME_PLAYLIST, playlist, name)
        }
        else {
            this.dispatchError(Event.RENAME_PLAYLIST, Err.PLAYLIST_NOT_FOUND, id, name)
            this._warning('Rename Playlist => ' + Err.PLAYLIST_NOT_FOUND)
        }
    }

    addSongToPlaylist(playlistID, songID) {
        // Check if the song and the playlist exists in the database
        const validSong = this.isValidSong(songID)
        const validPlaylist = this.isValidPlaylist(playlistID)

        // Check if the song is already in the playlist
        let exist
        if (validPlaylist) {
            const playlist = this.getPlaylist(playlistID)
            exist = playlist.songs.includes(songID)
        }

        // If everything is valid then add the song to the playlist and the playlist to the song
        if (validSong && validPlaylist && !exist) {
            // Update song
            const song = this.updateSong(songID, {
                playlists: playlistID
            }, '[]')

            // Update playlist
            const playlist = this.updatePlaylist(playlistID, {
                songs: songID
            }, '[]')

            // call the add_song_to_playlist event
            this.dispatchEvent(Event.ADD_SONG_TO_PLAYLIST, playlist, song)
        }
        // Error handling
        if (!validPlaylist) {
            this.dispatchError(Event.ADD_SONG_TO_PLAYLIST, Err.PLAYLIST_NOT_FOUND, playlistID, songID)
            this._warning('Add song to playlist => ' + Err.PLAYLIST_NOT_FOUND)
        }

        if (!validSong) {
            this.dispatchError(Event.ADD_SONG_TO_PLAYLIST, Err.SONG_NOT_FOUND, playlistID, songID)
            this._warning('Add song to playlist => ' + Err.SONG_NOT_FOUND)
        }

        if (exist) {
            this.dispatchError(Event.ADD_SONG_TO_PLAYLIST, Err.SONG_ALREADY_EXIST, playlistID, songID)
            this._warning('Add song to playlist => ' + Err.SONG_ALREADY_EXIST)
        }
    }

    async attachToPlaylist(url, id) {
        const song = this._getSongByURL(url)
        let returnSongID
        if (song) {
            returnSongID = song.id
            this.addSongToPlaylist(id, song.id)
        }

        else {
            const songID = await this.addSong(url)
            this.addSongToPlaylist(id, songID)
            returnSongID = songID
        }

        return returnSongID
    }

    removeSongFromPlaylist(playlistID, songID) {
        // Check if the song and the playlist exists in the database
        const validSong = this.isValidSong(songID)
        const validPlaylist = this.isValidPlaylist(playlistID)

        // If everything is valid then remove the song from the playlist and the playlist from the song
        if (validPlaylist && validSong) {
            // Get position and object
            const song_pos = this.getSongPosition(songID)
            const playlist_pos = this.getPlaylistPosition(playlistID)
            const song = this.getSong(songID)
            const playlist = this.getPlaylist(playlistID)

            // Get true if the playlist and the song are connected
            let connected

            // remove from the song connection with the playlist
            song.playlists.forEach((id, pos) => {
                if (id === playlistID) {
                    connected = true
                    this.db.delete(`/songs[${song_pos}]/playlists[${pos}]`)
                }
            })

            // If there is no connection between the song and the playlist throw an error
            if (!connected) {
                this.dispatchError(Event.REMOVE_SONG_FROM_PLAYLIST, Err.PLAYLIST_DOES_NOT_INCLUDE_SONG)
                this._warning('Remove song from playlist => ' + Err.PLAYLIST_DOES_NOT_INCLUDE_SONG)
            } else {
                // remove from the playlist connection with the song
                playlist.songs.forEach((id, pos) => {
                    if (id === songID)
                        this.db.delete(`/playlists[${playlist_pos}]/songs[${pos}]`)
                })

                this.dispatchEvent(Event.REMOVE_SONG_FROM_PLAYLIST, playlist, song)
            }
        }

        // Error handling
        if (!validPlaylist) {
            this.dispatchError(Event.REMOVE_SONG_FROM_PLAYLIST, Err.PLAYLIST_NOT_FOUND, playlistID, songID)
            this._warning('Remove song from playlist => ' + Err.PLAYLIST_NOT_FOUND)
        }

        if (!validSong) {
            this.dispatchError(Event.REMOVE_SONG_FROM_PLAYLIST, Err.SONG_NOT_FOUND, playlistID, songID)
            this._warning('Remove song from playlist => ' + Err.SONG_NOT_FOUND)
        }


    }

    async addSong(url) {
        // Check if song already exist
        let exist
        this.songs.forEach(song => {
            if (song.path === url)
                exist = true
        })

        // If not exist - create one
        let return_id = null
        if (!exist) {
            try {
                // Check if file exist and if type of the supported
                const mime = mimeType.lookup(path.extname(url))
                const canPLay = this.audio.canPlayType(mime)

                if (canPLay) {
                    // create song object
                    const id = this._generateID()
                    return_id = id
                    const song = {
                        metadata: {},
                        id,
                        path: url,
                        played: 0,
                        fav: false,
                        timestamp: Date.now(),
                        playlists: []
                    }
                    // Push song object to databse
                    this.db.push('/songs[]', song)
                    this.dispatchEvent(Event.ADD_SONG, song)

                    try {
                        // Get metadata of the song
                        const metadata = await this._getMetadata(url, id)

                        // Push metadata to the song object
                        const index = this.getSongPosition(id)
                        this.db.push(`/songs[${index}]/metadata`, metadata)
                        this.dispatchEvent(Event.ADD_METADATA, song, metadata)
                    }
                    catch (err) {
                        this.dispatchError(Event.ADD_METADATA, Err.METADATA, url, err)
                        this._warning('Metadata => ' + Err.METADATA)
                        this._warning(err)
                    }
                }

                else {
                    this.dispatchError(Event.ADD_SONG, Err.UNSUPPORTED_FILE, url)
                    this._warning('Add song => ' + Err.UNSUPPORTED_FILE)
                }

            }
            catch (err) {
                this.dispatchError(Event.ADD_SONG, Err.FILE_NOT_FOUND, url)
                this._warning('Add song => ' + Err.FILE_NOT_FOUND)
            }
        }
        else {
            this.dispatchError(Event.ADD_SONG, Err.SONG_ALREADY_EXIST, url)
            this._warning('Add song => ' + Err.SONG_ALREADY_EXIST)
        }

        return return_id
    }

    removeSong(id) {
        const song = this.updateSong(id, null)

        // remove id from playlists
        // todo use playlists prop in songs to find playlists dont loop through all of them
        this.playlists.forEach((playlist, index) => {
            if (playlist.songs.includes(id)) {
                playlist.songs.forEach((songID, pos) => {
                    if (songID === id)
                        this.db.delete(`/playlists[${index}]/songs[${pos}]`)
                })
            }
        })

        // remove id from fav and recents
        const favs = this.favIDs
        const recents = this.recentIDs

        favs.forEach((fav, pos) => {
            if (fav === id)
                this.db.delete(`/fav[${pos}]`)
        })

        recents.forEach((recent, pos) => {
            if (recent === id)
                this.db.delete(`/recents[${pos}]`)
        })

        // remove picture
        if (song.metadata.picture) {
            this._removePicture(song.metadata.picture)
        }

        if (song) {
            this.dispatchEvent(Event.REMOVE_SONG, song)
        }
        else {
            this.dispatchError(Event.REMOVE_SONG, Err.SONG_NOT_FOUND, id)
            this._warning('Remove song => ' + Err.SONG_NOT_FOUND)
        }
    }

    addFav(id) {
        let exist = this.isValidSong(id)
        let isFav = this.isFav(id)

        if (!exist) {
            this.dispatchError(Event.ADD_FAV, Err.SONG_ALREADY_EXIST, id)
            this._warning(Err.SONG_NOT_FOUND)
        }
        else if (isFav) {
            this.dispatchError(Event.ADD_FAV, Err.SONG_IS_ALREADY_FAV, id)
            this._warning(Err.SONG_IS_ALREADY_FAV)
        }
        else {
            const song = this.updateSong(id, { fav: true })
            this.db.push('/fav[]', id)
            this.dispatchEvent(Event.ADD_FAV, song)
            return song
        }
    }

    removeFav(id) {
        let exist = this.isValidSong(id)
        let isFav = this.isFav(id)

        if (!exist) {
            this.dispatchError(Event.REMOVE_FAV, Err.SONG_NOT_FOUND, id)
            this._warning(Err.SONG_NOT_FOUND)
        }
        else if (!isFav) {
            this.dispatchError(Event.REMOVE_FAV, Err.SONG_IS_NOT_FAV, id)
            this._warning(Err.SONG_IS_NOT_FAV)
        }
        else {
            const song = this.updateSong(id, { fav: false })

            let pos
            this.favIDs.forEach((fav_id, index) => {
                if (fav_id === id)
                    pos = index
            })
            this.db.delete(`/fav[${pos}]`)
            this.dispatchEvent(Event.REMOVE_FAV, song)
            return song
        }
    }

    toogleFav(id) {
        const isFav = this.isFav(id)
        if (isFav)
            this.removeFav(id)
        else
            this.addFav(id)
    }

    played(id) {
        const song = this.getSong(id)

        if (song) {
            const played = song.played + 1
            this.updateSong(id, {
                played
            })
        }
        else {
            this._warning(Err.SONG_NOT_FOUND)
        }
    }

    recent(id) {
        const isValid = this.isValidSong(id)

        if (isValid) {
            const recents = this.recentIDs

            const newRecents = recents.filter(rec => rec !== id)
            newRecents.push(id)

            this.db.push('/recents', newRecents)
            this.dispatchEvent(Event.RECENT_CHANGE, id)
        }
        else {
            this.dispatchError(Event.RECENT_CHANGE, Err.SONG_NOT_FOUND)
            this._warning(Err.SONG_NOT_FOUND)
        }
    }

    updatePlaylist(id, data, array = false) {
        return this._update(this.playlists, 'playlists', id, data, array)
    }

    updateSong(id, data, array = false) {
        return this._update(this.songs, 'songs', id, data, array)
    }

    getPlaylistPosition(id) {
        return this._getPosition(this.playlists, id)
    }

    getSongPosition(id) {
        return this._getPosition(this.songs, id)
    }

    getSong(id) {
        return this._getByID(this.songs, id)
    }

    getPlaylist(id) {
        return this._getByID(this.playlists, id)
    }

    getPlaylistWithSongs(playlistID) {
        const playlist = this.getPlaylist(playlistID)
        let newPlaylist
        if (playlist) {
            newPlaylist = getImmutable(playlist, true)
            newPlaylist.songs = playlist.songs.map(songID => this.getSong(songID))
        }
        else
            this._warning('getPlaylistWithSongs => ' + Err.PLAYLIST_NOT_FOUND)

        return newPlaylist
    }

    isValidSong(id) {
        return this._isValid(this.songs, id)
    }

    isValidPlaylist(id) {
        return this._isValid(this.playlists, id)
    }

    isFav(id) {
        const song = this.getSong(id)
        if (song)
            return song.fav
    }

    _update(obj, type, id, data, array) {
        const index = this._getPosition(obj, id)
        const item = this._getByID(obj, id)

        const pushToArray = array ? '[]' : ''

        if (item) {
            if (data === null) {
                this.db.delete(`/${type}[${index}]`)
            }
            else {
                for (const prop in data) {
                    const value = data[prop]
                    const dataPath = `/${type}[${index}]/${prop}${pushToArray}`
                    if (value === null) {
                        this.db.delete(dataPath, value)
                    }
                    else {
                        this.db.push(dataPath, value)
                    }
                }
            }
        }
        return item
    }

    _isValid(obj, id) {
        let valid = false
        obj.forEach(item => {
            if (item.id === id)
                valid = true
        })
        return valid
    }

    _getPosition(obj, id) {
        let index
        obj.forEach((item, position) => {
            if (item.id === id)
                index = position
        })

        return index
    }

    _getByID(obj, id) {
        let item
        obj.forEach(prop => {
            if (prop.id === id)
                item = prop
        })

        return item
    }

    _getSongByURL(url) {
        let item
        this.songs.forEach(song => {
            if (song.path === url)
                item = song
        })

        return item
    }

    _generateID() {
        return crypto.randomBytes(16).toString('hex')
    }

    async _getMetadata(url, id) {
        const data = await getMetadata.parseFile(url, { duration: true, skipCovers: false })
        let picture

        if (data.common.picture) {
            const buffer = data.common.picture[0].data
            const ext = data.common.picture[0].format.replace('image/', '')
            const imageFile = path.join(__dirname, '../../database/cover', `${id}.${ext}`)
            picture = imageFile

            file.write(imageFile, buffer, 'binary').catch(err => {
                this._warning('Can\'t create picture')
                console.error(err)
            })
        }


        const { name } = path.parse(url)
        const title = data.common.title || name

        let artist = ''
        if (data.common.artists)
            artist = data.common.artists.join(', ')
        else if (data.common.artist)
            artist = data.common.artist
        else if (data.common.albumartist)
            artist = data.common.albumartist

        const album = data.common.album || ''
        const duration = data.format.duration

        return {
            title,
            artist,
            album,
            duration,
            picture
        }
    }

    async _removePicture(url) {
        try {
            await file.remove(url)
        }
        catch (err) {
            this._warning('Can\'t remove picture from db')
            console.error(err)
        }
        return url
    }

    _getSongGroup(callback) {
        const props = {}
        const unknown = []

        this.loadedSongs.forEach(song => {
            const value = callback.call(this, song)
            if (value) {
                if (value in props) {
                    props[value].songs.push(song)
                }
                else {
                    props[value] = {
                        songs: [song],
                        artist: song.metadata.artist || (song.metadata.artists || []).join(',') || song.metadata.albumartist
                    }
                }
            }
            else {
                unknown.push(song)
            }
        })

        return {
            unknown,
            props
        }
    }

    _warning(msg) {
        if (this.warnings)
            console.warn(msg)
    }

    __clear__(reload = true) {
        this.__clear_fav__()
        this.__clear_songs__()
        this.__clear_playlists__()
        this.__clear_recents__()
        this.__clear_def__()
        if (reload)
            location.reload()
    }

    __clear_songs__() {
        this.db.push('/songs', [])
        const pictures = path.join(__dirname, '../../database/cover')
        fs.readdir(pictures, (err, files) => {
            if (err) throw err
            files.forEach(file => {
                fs.unlink(path.join(pictures, file), err => {
                    if (err) throw err
                })
            })
        })
    }

    __clear_playlists__() {
        this.db.push('/playlists', [])
    }

    __clear_recents__() {
        this.db.push('/recents', [])
    }

    __clear_fav__() {
        this.db.push('/fav', [])
        this.songs.forEach(song => {
            this.updateSong(song.id, { fav: false })
        })
    }

    __clear_def__() {
        this.db.push('/def', {
            volume: .75,
            volumeOff: false,
            repeat: 0,
            shuffle: false,
            currentTime: null,
            prevVolume: null,
            renderer: null,
            page: null,
            song: null,
            filter: null
        })
    }
}

module.exports = Model
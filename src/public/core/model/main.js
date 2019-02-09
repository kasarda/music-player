const Model = require('./model')
const { Ev, Err, getFilterText, Render } = require('../../lib/common')

class MainModel extends Model {
    constructor(worker, USER_DATA_PATH) {
        super(worker, USER_DATA_PATH)

        if (!localStorage.key('theme'))
            localStorage.setItem('theme', 'dark')

        if (this.worker) {
            this.worker.read('add', songs => {
                const addedSongs = this._pushSongs(songs)
                // this.db.read()
                if (addedSongs.length)
                    this.dispatchEvent(Ev.ADD_SONG, addedSongs)
            })

            this.worker.read('remove', songs => {
                for (const id of songs)
                    if (id)
                        this.removeSong(id)
            })

            this.worker.read('update', data => {
                for (const { id, metadata } of data)
                    this._updateSongMetadata(id, metadata)
            })

            this.worker.read('add:cover', cover => {
                this.db.get('cover').push(cover).write()
            })

            this.worker.read('push:cover', ({ path, id }) => {
                this.db.get('cover').find({ path }).get('songs').push(id).write()
            })

            this.worker.read('add:songToPlaylist', ({ ids, playlistID }) => {
                for (const id of ids)
                    this.addSongToPlaylist(id, playlistID)
            })
        }
    }

    get albums() {
        return this._getAlbums(this.songs)
    }

    get artists() {
        return this._getArtists(this.songs)
    }

    getAlbum(name, artist) {
        return this._.find(this.albums, {
            name,
            artist
        })
    }

    getArtist(name) {
        return this._.find(this.artists, {
            name
        })
    }











    addSong(URL, folder, playlistID) {
        const urls = []
            .concat(URL)
            .filter(url => !this.isSongInDB({ path: url }))

        if (urls.length)
            this.worker.send('add:song', { urls, folder, playlistID })
    }

    removeSong(songID) {
        const song = this.getSongByID(songID)

        if (song) {
            for (const playlistID of song.playlists) {
                this.removeSongFromPlaylist(songID, playlistID)
            }

            this.removeSongFromCover(songID, song.metadata.cover)
            this.removeFav(songID)
            this.removeRecent(songID)
            this.db.get('songs').remove({ id: song.id }).write()
            this.dispatchEvent(Ev.REMOVE_SONG, song)
            return song
        }
        else {
            this.dispatchError(Ev.REMOVE_SONG, Err.SONG_NOT_FOUND, songID)
        }
    }

    async addFolder(folderURL, playlistID) {
        /**
         * 
         * if folder doesnt exis add him
         * if DB include song in folder add to this songs folder prop but do not create theme again or remove theme
         * if folder is sup dont remove songs from sub
         */

        if (this.folders.includes(folderURL)) {
            this.dispatchError(Ev.ADD_FOLDER, Err.FOLDER_ALREADY_EXIST, folderURL)
        }
        else {
            try {
                await this.fs.exist(folderURL)

                const subs = []
                const sups = []
                for (const folder of this.folders) {
                    const isSubFolder = this.isSubFolder(folder, folderURL)
                    if (isSubFolder)
                        subs.push(folder)

                    const isSupFolder = this.isSupFolder(folder, folderURL)
                    if (isSupFolder)
                        sups.push(folder)
                }

                if (subs.length) {
                    this.dispatchError(Ev.ADD_FOLDER, Err.FOLDER_IS_SUB_FOLDER, folderURL)
                }
                else {
                    let exclude = []
                    if (sups.length) {
                        for (const sup of sups) {
                            const songsPath = this._removeSupFolder(sup, folderURL)
                            if (songsPath)
                                exclude.push(...songsPath)
                        }
                    }

                    this.db.get('folders').push(folderURL).write()
                    this.dispatchEvent(Ev.ADD_FOLDER, folderURL)

                    // mainWorker
                    this.worker.send('add:folder', {
                        folder: folderURL,
                        exclude,
                        playlistID
                    })
                }

            }
            catch (err) {
                this.dispatchError(Ev.ADD_FOLDER, Err.FOLDER_NOT_FOUND, folderURL, err)
            }
        }
    }

    removeFolder(folderURL) {
        if (this.folders.includes(folderURL)) {

            const songs = this.songs.filter(song => song.folder !== folderURL)
            const removed = this.songs.filter(song => song.folder === folderURL)
            const removedID = removed.map(({ id }) => id)
            const covers = this._.uniq(removed.map(song => song.metadata.cover))
            const playlists = this._.uniq(this._.flatten(removed.map(song => song.playlists)))

            this.db.get('folders').pull(folderURL).write()
            this.db.get('disabled').remove({ folder: folderURL }).write()
            this.db.get('favs').pull(...removedID).write()
            this.db.get('recents').pull(...removedID).write()


            this.db.get('cover')
                .filter(o => covers.includes(o.path))
                .map(cover => {
                    cover.songs = this._.pull(cover.songs, ...removedID)
                    return cover
                }).write()

            this.db.get('cover').remove(({ songs, path }) => {
                if (!songs.length) {
                    this.fs.unlink(path)
                    worker.send('reset cover', path)
                }
                return !songs.length
            }).write()


            this.db.get('playlists').filter(p => playlists.includes(p.id))
                .map(playlist => {
                    playlist.songs = this._.pull(playlist.songs, ...removedID)
                    return playlist
                }).write()



            this.db.set('songs', songs).write()

            this.dispatchEvent(Ev.REMOVE_FOLDER, removed, folderURL)
        }
        else {
            this.dispatchError(Ev.REMOVE_FOLDER, Err.FOLDER_NOT_FOUND, folderURL)
        }
    }






















    async addPlaylist(name) {
        name = String(name)
        if (name) {
            const id = this.generateID()
            const playlist = {
                name,
                id,
                songs: []
            }
            this.db.get('playlists').push(playlist).write()
            this.dispatchEvent(Ev.ADD_PLAYLIST, playlist)
            return playlist
        }
        else {
            this.dispatchError(Ev.ADD_PLAYLIST, Err.INVALID_NAME, name)
            throw new SyntaxError(Err.INVALID_NAME)
        }
    }

    removePlaylist(playlistID) {
        const playlist = this.getPlaylistByID(playlistID)

        if (playlist) {
            for (const songID of playlist.songs) {
                this.removeSongFromPlaylist(songID, playlistID)
            }

            this.db.get('playlists').remove({ id: playlistID }).write()
            this.dispatchEvent(Ev.REMOVE_PLAYLIST, playlist)
            return playlist
        }
        else {
            this.dispatchError(Ev.REMOVE_PLAYLIST, Err.PLAYLIST_NOT_FOUND, playlistID)
        }
    }

    renamePlaylist(playlistID, name) {
        name = String(name)
        const playlist = this.getPlaylistByID(playlistID)
        if (name) {
            if (playlist) {
                this.db.get('playlists').find(playlist).assign({ name }).write()
                this.dispatchEvent(Ev.RENAME_PLAYLIST, playlist, name)
                return name
            }
            else {
                this.dispatchError(Ev.RENAME_PLAYLIST, Err.PLAYLIST_NOT_FOUND, playlistID, name)
            }
        }
        else {
            this.dispatchError(Ev.RENAME_PLAYLIST, Err.INVALID_NAME, playlistID, name)
        }
    }

    isSongInPlaylist(songID, playlistID) {
        const song = this.isSongInDB({ id: songID })
        const playlist = this.getPlaylistByID(playlistID)

        return !!(song && playlist && playlist.songs.includes(songID))
    }

    addSongToPlaylist(songID, playlistID) {
        if (!this.isSongInPlaylist(songID, playlistID)) {
            this.db.get('playlists').find({ id: playlistID }).get('songs').push(songID).write()
            this.db.get('songs').find({ id: songID }).get('playlists').push(playlistID).write()
            this.dispatchEvent(Ev.ADD_SONG_TO_PLAYLIST, songID, playlistID)
        }

        else {
            this.dispatchError(Ev.ADD_SONG_TO_PLAYLIST, Err.CANT_ADD_SONG_TO_PLAYLIST, songID, playlistID)
        }
    }

    removeSongFromPlaylist(songID, playlistID) {
        if (this.isSongInPlaylist(songID, playlistID)) {
            this.db.get('playlists').find({ id: playlistID }).get('songs').pull(songID).write()
            this.db.get('songs').find({ id: songID }).get('playlists').pull(playlistID).write()
            this.dispatchEvent(Ev.REMOVE_SONG_FROM_PLAYLIST, songID, playlistID)
        }
        else {
            this.dispatchError(Ev.REMOVE_SONG_FROM_PLAYLIST, Err.CANT_REMOVE_SONG_FROM_PLAYLIST, songID, playlistID)
        }
    }















    addFav(songID) {
        const isSongInDB = this.isSongInDB({ id: songID })

        if (isSongInDB) {
            if (!this.favs.includes(songID)) {
                this.db.get('favs').unshift(songID).write()
                this.dispatchEvent(Ev.FAV, songID, true)
            }
            else {
                this.dispatchError(Ev.FAV, Err.SONG_IS_ALREADY_FAV, songID, true)
            }
        }
        else {
            this.dispatchError(Ev.FAV, Err.SONG_NOT_FOUND, songID, true)
        }
    }

    removeFav(songID) {
        const isSongInDB = this.isSongInDB({ id: songID })

        if (isSongInDB) {
            this.db.get('favs').pull(songID).write()
            this.dispatchEvent(Ev.FAV, songID, false)
        }
        else {
            this.dispatchError(Ev.FAV, Err.SONG_NOT_FOUND, songID, false)
        }
    }

    toggleFav(songID) {
        if (this.isFav(songID))
            this.removeFav(songID)
        else
            this.addFav(songID)
    }

    addRecent(songID) {
        const isSongInDB = this.isSongInDB({ id: songID })

        if (isSongInDB) {
            if (this.recents.includes(songID))
                this.db.get('recents').pull(songID).write()

            this.db.get('recents').unshift(songID).write()
            this.dispatchEvent(Ev.RECENT_CHANGE, songID)
        }
        else {
            this.dispatchError(Ev.RECENT_CHANGE, Err.SONG_NOT_FOUND, songID)
        }
    }

    removeRecent(songID) {
        this.db.get('recents').pull(songID).write()
    }

    removeSongFromCover(id, path) {
        const songs = this.db.get('cover').find({ path }).get('songs')
        const songsValue = songs.value()
        if (songsValue) {
            songs.pull(id).write()

            const size = songsValue.length
            if (!size) {
                this.db.get('cover').remove({ path }).write()
                this.fs.unlink(path)
                worker.send('reset cover', path)
            }
        }
    }

    disableSong(songID) {
        const song = this.getSongByID(songID)
        if (song) {
            if (song.folder) {
                const disabledFolder = this.db.get('disabled').find({ folder: song.folder }).cloneDeep().value()

                if (disabledFolder) {
                    this.db.get('disabled')
                        .find({ folder: song.folder })
                        .get('songs')
                        .push(song.path).write()
                }
                else {
                    this.db.get('disabled').push({
                        folder: song.folder,
                        songs: [song.path]
                    }).write()
                }
            }

            this.removeSong(songID)
        }
        else {
            console.warn('Song doesnt exist')
        }
    }

    countSong(songID) {
        this.db.get('songs').find({ id: songID }).update('played', a => a + 1).write()
    }

    search(value) {
        const text = getFilterText(value)
        const ids = this.db.get('songs').value()
            .map(song => ({
                text: getFilterText(song.metadata.title, song.metadata.artists.join(''), song.metadata.albumartist, song.metadata.album),
                id: song.id
            }))
            .filter(song => song.text.includes(text))
            .map(song => song.id)

        const songs = this.getSongsByIDs(ids)

        return {
            songs,
            albums: this._getAlbums(songs),
            artists: this._getArtists(songs)
        }
    }









    setDef(obj) {
        const data = {}
        if (typeof obj.volume === 'number' && !isNaN(obj.volume))
            data.volume = Math.min(Math.max(0, obj.volume), 1)
        else if ('volume' in obj)
            data.volume = .75

        if (typeof obj.theme === 'string')
            data.theme = obj.theme
        else if ('theme' in obj)
            data.theme = 'dark'

        if (typeof obj.currentID === 'string' && this.isID(obj.currentID))
            data.currentID = obj.currentID
        else if ('currentID' in obj)
            data.currentID = null

        if (this._.isPlainObject(obj.queue) && !this._.isEmpty(obj.queue))
            data.queue = `JSON=>${JSON.stringify(obj.queue)}`
        else if ('queue' in obj)
            data.queue = null

        if (obj.page instanceof Array && !this._.isEmpty(obj.page))
            data.page = `JSON=>${JSON.stringify(obj.page)}`
        else if ('page' in obj)
            data.page = `JSON=>${JSON.stringify([Render.MUSIC])}`

        for (const prop in data)
            localStorage.setItem(prop, data[prop])
    }

    get def() {
        const vol = parseFloat(localStorage.getItem('volume'))
        const volume = Math.min(Math.max(0, isNaN(vol) ? .75 : vol), 1)
        const theme = localStorage.getItem('theme') || 'dark'
        const id = localStorage.getItem('currentID')
        const currentID = this.isID(id) ? id : null
        const page = this._JSONParse(localStorage.getItem('page')) || [Render.MUSIC]
        const queue = this._JSONParse(localStorage.getItem('queue'))

        return {
            volume,
            theme,
            currentID,
            page,
            queue
        }
    }





    canPlay(src) {
        return new Promise(resolve => {
            const audio = new Audio()
            audio.src = src
            audio.onerror = _ => resolve(false)
            audio.ondurationchange = _ => resolve(true)
        })
    }







    _updateSongMetadata(songID, metadata) {
        this.db.get('songs').find({ id: songID }).set('metadata', metadata).write()
        this.dispatchEvent(Ev.UPDATE, songID, metadata)
    }

    _pushSongs(songs) {
        const uniqueSongs = songs.filter(song => !this.isSongInDB({ path: song.path }))
        this.db.get('songs').unshift(...uniqueSongs).write()
        return uniqueSongs
    }

    _removeSupFolder(folderURL, sub) {
        if (this.folders.includes(folderURL)) {
            const songs = this.db.get('songs')
                .filter(song => song.folder === folderURL)
                .map(song => {
                    song.folder = sub
                    return song
                }).write()

            this.db.get('folders').pull(folderURL).write()
            return songs.map(({ path }) => path)
        }
    }



    _JSONParse(str) {
        if (typeof str === 'string') {
            const val = str.replace(/^JSON=>/, '')
            const isObj = ['[', '{'].includes(val[0])

            if (isObj)
                return JSON.parse(val)
            else
                return null
        }

        return null
    }

    _getAlbums(songs) {
        const albums = []
        const unknown = []

        songs.forEach(song => {
            const resultList = albums.map(albumObj => albumObj.name)
            const no = parseFloat(`${song.metadata.disk.no || 1}` + song.metadata.track.no)

            if (!song.metadata.album) {
                unknown.push(song.id)
            }
            else if (!resultList.includes(song.metadata.album)) {
                albums.push({
                    name: song.metadata.album,
                    artist: song.metadata.albumartist,
                    songs: [{ id: song.id, no }],
                    duration: song.metadata.duration,
                    year: song.metadata.year,
                    cover: song.metadata.cover
                })
            }
            else {
                const albumObject = this._.find(albums, {
                    name: song.metadata.album
                })

                if (albumObject) {
                    albumObject.songs.push({ id: song.id, no })
                    albumObject.duration += song.metadata.duration
                }
            }
        })

        albums.map(album => {
            const sorted = this._.sortBy(album.songs, ['no'])
            album.songs = sorted.map(song => song.id)
            return album
        })

        const sortedAlbums = this._.sortBy(this._.sortBy(albums, ['year']).reverse(), 'artist')

        if (unknown.length) {
            sortedAlbums.push({
                name: null,
                artist: null,
                songs: unknown,
                duration: this._getDuration(unknown),
                year: null,
                cover: null

            })
        }

        return sortedAlbums
    }

    _getDuration(ids) {
        const songs = this.getSongsByIDs(ids)
        if (songs) {
            let val = 0

            songs.forEach(song => {
                val += song.metadata.duration || 0
            })

            return val
        }

    }

    _getArtists(songs) {
        const artists = []
        const unknown = []

        songs.forEach(song => {
            const { album, albumartist, year, track, disk } = song.metadata
            const { id } = song
            const no = parseFloat(`${disk.no || 1}` + track.no)

            if (song.metadata.artists.length) {
                song.metadata.artists.forEach(artist => {
                    const isAlbumArtist = artist === albumartist

                    const names = artists.map(a => a.name)
                    if (!names.includes(artist)) {
                        artists.push({
                            name: artist,
                            songs: [{ id, year, album, no }],
                            albums: album && isAlbumArtist ? [{ name: album, albumartist, year }] : [],
                            singles: !album || !isAlbumArtist ? [id] : []
                        })
                    }
                    else {
                        const artistObject = this._.find(artists, { name: artist })
                        artistObject.songs.push({ id, year, album, no })
                        if (album && !artistObject.albums.map(a => a.name).includes(album) && isAlbumArtist) {
                            artistObject.albums.push({ name: album, albumartist, year })
                        }
                        else if (!album || !isAlbumArtist) {
                            artistObject.singles.push(id)
                        }
                    }
                })
            }
            else {
                unknown.push(id)
            }
        })

        const sortedArtists = this._.sortBy(artists.map(artist => {
            artist.albums = this._.sortBy(artist.albums, ['year']).reverse()
            artist.songs = this._.sortBy(this._.sortBy(this._.sortBy(artist.songs, ['album']), ['no']), ({ year }) => year * -1).map(({ id }) => id)
            return artist
        }), ['name'])

        if (unknown.length) {
            sortedArtists.push({
                albums: [],
                name: null,
                singles: unknown,
                songs: unknown
            })
        }

        return sortedArtists
    }
}

module.exports = MainModel
const path = require('path')
const crypto = require('crypto')
const mime = require('mime/lite')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const fs = require('../../lib/fs')
const EventListener = require('../../lib/event')
const createDB = require('../../lib/createDB')


class Model extends EventListener {
    constructor(worker, USER_DATA_PATH) {
        super({ logError: true })

        this.AUDIO_MIME = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/flac']
        this.DEEP_LEVEL = 5
        this.USER_DATA_PATH = USER_DATA_PATH
        this.DB_FOLDER = path.join(this.USER_DATA_PATH, 'musicPlayerDB')
        this.COVER_PATH = path.join(this.DB_FOLDER, 'cover')
        this.DB_PATH = path.join(this.DB_FOLDER, 'db.json')

        try {
            const adapter = new FileSync(this.DB_PATH)
            this.db = low(adapter)
        }
        catch (err) {
            void (async _ => {
                await createDB(this.USER_DATA_PATH)
                const adapter = new FileSync(this.DB_PATH)
                this.db = low(adapter)
            })()
        }

        if (!this.db && 'reload' in location)
            location.reload()

        this.DEFAULTS = {
            songs: [],
            playlists: [],
            recents: [],
            favs: [],
            folders: [],
            disabled: [],
            cover: []
        }


        this.db.defaults(this.DEFAULTS).write()

        this.worker = worker
        this._ = this.db._
        this.fs = fs
        this.mime = mime

        this.mime.define({ 'audio/flac': ['flac'] })
        this.mime.define({ 'audio/webm': ['webm', 'weba'] }, true)

    }

    get songs() {
        return this.db.get('songs').cloneDeep().value() || []
    }

    get folders() {
        return this.db.get('folders').cloneDeep().value() || []
    }

    get playlists() {
        return this.db.get('playlists').cloneDeep().value() || []
    }

    get favs() {
        return this.db.get('favs').cloneDeep().value() || []
    }

    get recents() {
        return this.db.get('recents').cloneDeep().value() || []
    }

    get mostPlayed() {
        return this.db.get('songs').filter(song => song.played > 0).sortBy('played').reverse().cloneDeep().value() || []
    }

    get disabled() {
        return this.db.get('disabled').cloneDeep().value() || []
    }

    getPlaylistByID(id) {
        return this.db.get('playlists').find({ id }).cloneDeep().value()
    }

    getSongByID(id) {
        return this.db.get('songs').find({ id }).cloneDeep().value()
    }

    getSongByPath(songPath) {
        return this.db.get('songs').find({ path: songPath }).cloneDeep().value()
    }

    getSongsByFolder(folder) {
        return this.db.get('songs').filter({ folder }).cloneDeep().value()
    }

    getSongs() {
        return this.db.get('songs').cloneDeep()
    }

    getPlaylists() {
        return this.db.get('playlists').cloneDeep()
    }

    getDisabledSongs(folder) {
        const disabled = this.db.get('disabled').find({ folder }).value()
        return (disabled && 'songs' in disabled) ? disabled.songs : []
    }

    getSongsByIDs(ids) {
        return ids.map(id => this.getSongByID(id)).filter(song => song)
    }

    getIDsFromSongs(songs) {
        return songs.map(song => song.id).filter(id => this.isID(id))
    }

    isFav(id) {
        return this.favs.includes(id)
    }

    isID(id) {
        return typeof id === 'string' && id.length === 32 && !/[^a-z0-9]+/g.test(id)
    }

    isSongInDB(obj) {
        return Boolean(this.db.get('songs').find(obj).value())
    }

    isPlaylistInDB(obj) {
        return Boolean(this.db.get('playlists').find(obj).value())
    }

    async isSongExist(url) {
        try {
            await this.fs.exist(url)
            return true
        }
        catch (err) {
            return false
        }
    }

    isAudio(url) {
        const type = this.mime.getType(url)
        return this.AUDIO_MIME.includes(type)
    }

    isSubFolder(sup, sub) {
        const supList = sup.split(path.sep)
        const subList = sub.split(path.sep)

        if (sub.includes(sup) && (subList.length - supList.length) < this.DEEP_LEVEL) {
            return true
        }
        return false
    }

    isSupFolder(sub, sup) {
        const supList = sup.split(path.sep)
        const subList = sub.split(path.sep)

        if (sub.includes(sup) && (subList.length - supList.length) < this.DEEP_LEVEL) {
            return true
        }
        return false
    }

    generateID() {
        return crypto.randomBytes(16).toString('hex')
    }

    async __clear__(clearLocalStorage = false) {
        
        if ('localStorage' in self && clearLocalStorage)
            localStorage.clear()

        this.db.setState(this.DEFAULTS).write()
        if ('reload' in location)
            location.reload()
        else
            console.warn('DB WAS CLEARED - CURRENT DB IS: ', this.db.getState())

        const files = await this.fs.readdir(this.COVER_PATH)
        for (const file of files)
            this.fs.unlink(path.join(this.COVER_PATH, file))
    }
}


module.exports = Model

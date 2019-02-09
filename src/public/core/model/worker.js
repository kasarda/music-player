const Model = require('./model')
const path = require('path')
const getMetadata = require('music-metadata')
const { Ev, Err } = require('../../lib/common')

class WatchModel extends Model {
    constructor(worker, USER_DATA_PATH) {
        super(worker, USER_DATA_PATH)
        this.COVERS = this.db.get('cover').map(cover => cover.path).value()
    }

    async createSong(url, folder) {
        let exist = this.isSongInDB({ path: url })
        const canPlay = this.isAudio(url)

        if (exist) {
            this.dispatchError(Ev.ADD_SONG, Err.SONG_ALREADY_EXIST, url)
        }
        else if (canPlay) {
            try {
                await this.fs.exist(url)

                const id = this.generateID()
                const song = {
                    metadata: {},
                    id,
                    path: url,
                    played: 0,
                    timestamp: Date.now(),
                    folder,
                    playlists: []
                }

                try {
                    // Get metadata of the song
                    const metadata = await this.getMetadata(url, id)
                    // Push metadata to the song object
                    return Object.assign(song, { metadata })
                }
                catch (err) {
                    this.dispatchError(Ev.ADD_SONG, Err.METADATA, err)
                }
            }
            catch (err) {
                this.dispatchError(Ev.ADD_SONG, Err.SONG_NOT_FOUND, err)
            }
        }
        else {
            this.dispatchError(Ev.ADD_SONG, Err.UNSUPPORTED_FILE, url)
        }
    }

    async getMetadata(url, id, ignoreCover = false) {
        try {
            const data = await getMetadata.parseFile(url, { duration: true, skipCovers: false })
            const picture = data.common.picture
            let cover = null

            if (picture && picture.length && !ignoreCover) {

                const frontCover = picture.filter(pic => pic.type === 'Cover (front)')
                const pic = frontCover.length ? frontCover[0] : picture[0]
                const buffer = pic.data
                const format = pic.format
                const size = buffer.length
                const from = size / 2
                let data = ''
                for (let i = 0; i < 10; i++) {
                    const pos = Math.round(from + i)
                    const chunk = buffer[pos]
                    if (chunk)
                        data += chunk.toString('32')
                }

                const ext = this.mime.getExtension(format) || 'jpeg'
                const fileName = `${size}${data}.${ext}`
                const filePath = path.join(this.COVER_PATH, fileName)


                const isCoverExist = this.COVERS.includes(filePath)
                cover = filePath

                if (!isCoverExist) {
                    // watchWorker
                    this.worker.send('add:cover', {
                        path: filePath,
                        songs: [id]
                    })

                    this.COVERS.push(filePath)
                    try {
                        await this.fs.writeFile(filePath, buffer, 'binary')
                    }
                    catch (err) {
                        console.error('Cant create image', err)
                        if (err.code === 'ENOENT') {
                            this.fs.createFiles({
                                type: 'dir',
                                path: this.COVER_PATH
                            })
                        }
                    }

                }
                else {
                    // watchWorker
                    this.worker.send('push:cover', {
                        path: filePath,
                        id
                    })
                }
            }

            const { name } = path.parse(url)
            const title = data.common.title || name
            const duration = data.format.duration || null
            const artists = data.common.artists || []
            const albumartist = data.common.albumartist || null
            const album = data.common.album || null
            const track = data.common.track || { no: null, of: null }
            const disk = data.common.disk || { no: null, of: null }
            const year = data.common.year || null

            return {
                title,
                artists,
                albumartist,
                album,
                track,
                disk,
                year,
                duration,
                cover
            }
        }
        catch (err) {
            console.warn('Cant add metadata', err)
        }
    }

    async getSongsFromFolder(folder, exclude = []) {
        const baseLevel = folder.split(path.sep).length
        const songs = []
        const getFilesFromFolder = async (folder, repeat) => {
            try {
                const res = await this.fs.readdir(folder)
                for (const item of res) {
                    const fileURL = path.join(folder, item)
                    if (!exclude.includes(fileURL)) {
                        const stat = await this.fs.exist(fileURL)
                        if (stat.isFile() && this.isAudio(fileURL))
                            songs.push(fileURL)
                        else if (stat.isDirectory()) {
                            const level = fileURL.split(path.sep).length - baseLevel
                            if (level < this.DEEP_LEVEL)
                                await repeat(fileURL, repeat)
                        }
                    }
                }
            }
            catch (err) {
                console.warn('FOLDER DOESNT EXIST', err)
            }
        }

        await getFilesFromFolder(folder, getFilesFromFolder)
        return songs
    }

    removeCover(path) {
        this.COVERS = this.COVERS.filter(cover => cover !== path)
    }
}

module.exports = WatchModel
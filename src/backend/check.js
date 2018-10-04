const path = require('path')
const fs = require('fs')
const JsonDB = require('node-json-db')
const getMetadata = require('music-metadata')
const { isEqualObject } = require('kasarda/node/common')

function updateSong(sender) {
    const file = path.join(__dirname, '../database/db.json')
    const db = new JsonDB(file, true, true)

    const songs = db.getData('/songs')

    songs.forEach(song => {
        fs.stat(song.path, err => {
            if (err) {
                sender.send('remove song', song.id)
            } else {
                getMetadata.parseFile(song.path, { duration: true, skipCovers: false })
                    .then(data => {
                        const metadata = {
                            duration: data.format.duration,
                            title: data.common.title,
                            album: data.common.album,
                            albumartist: data.common.albumartist,
                            artist: data.common.artist,
                            artists: data.common.artists,
                            //picture: data.common.picture
                        }
                        for(const prop in metadata) {
                            if(metadata[prop] === undefined)
                                delete metadata[prop]
                        }

                        if (!isEqualObject(metadata, song.metadata))
                            sender.send('update metadata', song.id, metadata)

                    })
            }
        })

    })
}


module.exports = updateSong
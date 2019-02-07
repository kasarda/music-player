const { createChunk } = require('../lib/common')
const WebWorker = require('kasarda/node/worker')
const worker = new WebWorker()

let model

worker.read('init_data', data => {
    const Model = require('./model/worker')
    model = new Model(worker, data)
})

addEventListener('message', _ => {
    if (model)
        model.db.read()
})


worker.read('watch', async _ => {
    // 1. Remove songs that are not playable and update metadata
    const removeChunk = createChunk(1000)
    const updateChunk = createChunk(1000)

    removeChunk.onFull(songs => {
        worker.send('remove', songs)
    })

    updateChunk.onFull(songs => {
        worker.send('update', songs)
    })

    let loading = false

    for (const song of model.songs) {
        const isExist = await model.isSongExist(song.path)
        if (!isExist) {
            removeChunk.add(song.id)
            if(!loading) {
                worker.send('loader:start')
                loading = true
            }
        }
        else {
            const metadata = await model.getMetadata(song.path, null, true)
            const metadataDB = song.metadata
            metadata.cover = metadataDB.cover

            if (!model.db._.isEqual(metadata, metadataDB)) {
                updateChunk.add({ id: song.id, metadata })
                if (!loading) {
                    worker.send('loader:start')
                    loading = true
                }
            }
        }
    }
    removeChunk.end()
    updateChunk.end()
    worker.send('loader:end')
    loading = false
    
    // 2. add songs
    const addChunk = createChunk(1000)
    addChunk.onFull(songs => {
        worker.send('add', songs)
    })

    for (const folder of model.folders) {
        const songs = await model.getSongsFromFolder(folder)
        const disabled = model.getDisabledSongs(folder)

        for (const path of songs) {
            if (!disabled.includes(path) && !model.isSongInDB({ path })) {
                const song = await model.createSong(path, folder)
                if (song) {
                    addChunk.add(song)
                    if(!loading) {
                        worker.send('loader:start')
                        loading = true
                    }
                }
            }
        }
    }
    addChunk.end()
    worker.send('loader:end')

})




worker.read('add_folder', async ({ folder, exclude, playlistID }) => {
    const files = await model.getSongsFromFolder(folder, exclude)
    createSongs(files, folder, playlistID)
})



worker.read('add_song', async ({ urls, folder, playlistID }) => {
    createSongs(urls, folder, playlistID)
})


worker.read('reset cover', path => {
    model.removeCover(path)
})


async function createSongs(files, folder, playlistID) {
    const chunk = createChunk(100)
    chunk.onFull(songs => {
        worker.send('add', songs)
        if (playlistID) {
            worker.send('add_to_playlist', {
                ids: songs.map(({ id }) => id),
                playlistID
            })
        }
    })
    worker.send('loader:start')

    for (const file of files) {
        const song = await model.createSong(file, folder)
        if (song)
            chunk.add(song)
    }
    chunk.end()
    worker.send('loader:end')
}
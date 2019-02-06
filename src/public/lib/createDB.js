const path = require('path')
const fs = require('./fs')

async function createDB(DB) {
    const DB_FOLDER = path.join(DB, 'musicPlayerDB')
    const DB_FILE = path.join(DB_FOLDER, 'db.json')
    const DB_COVER = path.join(DB_FOLDER, 'cover')

    try {
        await fs.exist(DB_FOLDER)
        try {
            await fs.exist(DB_FILE)
        }
        catch (err) {
            fs.createFiles({
                type: 'file',
                path: DB_FILE
            })
        }

        try {
            await fs.exist(DB_COVER)
        }
        catch (err) {
            fs.createFiles({
                type: 'dir',
                path: DB_COVER
            })
        }
    }
    catch (err) {
        try {
            await fs.mkdir(DB_FOLDER, { recursive: true })
            await fs.createFiles(
                {
                    type: 'file',
                    path: DB_FILE
                },
                {
                    type: 'dir',
                    path: DB_COVER
                })
        }
        catch (err) {
            console.log(err)
        }
    }
}

module.exports = createDB
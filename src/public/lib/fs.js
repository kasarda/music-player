const fs = require('fs')
const util = require('util')

module.exports = {
    exist: util.promisify(fs.stat),
    readdir: util.promisify(fs.readdir),
    writeFile: util.promisify(fs.writeFile),
    unlink: util.promisify(fs.unlink),
    mkdir: util.promisify(fs.mkdir),
    async createFiles(...URLs) {
        try {
            for (const { type, path } of URLs) {
                if (type === 'file')
                    await this.writeFile(path, '')
                else if (type === 'dir')
                    await this.mkdir(path, { recursive: true })
            }
            return true
        }
        catch (err) {
            console.error(err)
            return false
        }
    }
}
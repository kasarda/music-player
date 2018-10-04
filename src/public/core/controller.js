const EventListener = require('../lib/event')
const { Repeat } = require('../lib/common')
const { rand, isEqualObject } = require('kasarda/node/common')

class Controller extends EventListener {
    constructor(model) {
        super()
        this.model = model

        this.originList = []
        this.queueList = []
        this.filterText
        this.audio = new Audio
        this.current

        this.renderer = model.def.renderer || {}

        this.repeat = model.def.repeat || Repeat.NOREPEAT
        this.shuffle = model.def.shuffle || false


        // Audio events
        this.audio.addEventListener('ended', _ => this.next())
        this.audio.addEventListener('play', _ => {
            this.dispatchEvent('play', _)
            model.played(this.current)
            model.recent(this.current)
        })

        this.audio.addEventListener('pause', _ => this.dispatchEvent('pause'))
        this.audio.addEventListener('timeupdate', _ => this.dispatchEvent('timeupdate'))
        this.audio.addEventListener('loadedmetadata', _ => this.dispatchEvent('loadedmetadata'))
        this.audio.addEventListener('canplay', _ => this.dispatchEvent('canplay'))


        // set default volume
        this.audio.volume = model.def.volume
    }

    addSongs(songs) {
        if (songs instanceof Array)
            this.originList = songs
        else console.error('Songs must be type of array')

        return this
    }

    filter(filter, data) {
        console.log('FILTER', filter)
        if (typeof filter === 'string') {
            this.filterText = filter
            const text = filter.toLowerCase().replace(/ /g, '')

            const filtered = this.originList.filter(song => {
                const filterText = (song.metadata.title + song.metadata.artist + song.metadata.album).toLowerCase().replace(/ /g, '')
                return filterText.includes(text)
            })
            this.queueList = filtered
            this.dispatchEvent('filter', filter, data)
        }
        else {
            this.filterText = undefined
        }
        return this
    }

    queue(songs, renderer) {
        this.queueList = songs

        if (renderer)
            this.renderer = renderer
        return this
    }

    playSong(song, pause = false) {
        this.audio.src = song.path
        this.current = song.id

        if (!pause)
            this.audio.play()
        return this
    }

    clearSong() {
        this.audio.src = ''
        this.dispatchEvent('clear')
        return this
    }

    play(id, pause = false) {
        if (id) {
            for (const song of this.queueList) {
                if (song.id === id) {
                    this.playSong(song, pause)
                    break
                }
            }
        }
        else if (this.queueList.length) {
            const song = this.queueList[0]
            this.playSong(song, pause)
        }
        else {
            this.clearSong()
        }

        return this
    }

    pause(pause = true) {
        if (pause)
            this.audio.pause()

        return this
    }

    toogle() {
        if (this.audio.paused)
            this.audio.play()
        else
            this.audio.pause()

        return this
    }

    next(force = false) {
        for (const [index, song] of this.queueList.entries()) {
            if (song.id === this.current) {
                let next = index + 1
                let pause = false

                if (!force) {
                    switch (this.repeat) {
                        case Repeat.NOREPEAT:
                            if (next >= this.queueList.length) {
                                next = 0
                                pause = true
                            }
                            break
                        case Repeat.REPEAT:
                            if (next >= this.queueList.length)
                                next = 0
                            break
                        case Repeat.REPEAT_ONE:
                            next = index
                            break
                    }

                }

                if (this.shuffle) {
                    next = rand(0, this.queueList.length - 1)
                    pause = false
                }

                if (next >= this.queueList.length)
                    next = 0

                const nextSong = this.queueList[next]
                if (nextSong)
                    this.playSong(nextSong, pause)
                else
                    console.log('next does not exist')
                break
            }
        }
    }

    prev() {
        for (const [index, song] of this.queueList.entries()) {
            if (song.id === this.current) {
                let prev = index - 1

                if (this.shuffle || this.audio.currentTime > 5)
                    prev = index

                if (prev < 0 || prev >= this.queueList.length)
                    prev = 0

                this.playSong(this.queueList[prev])
                break
            }
        }
    }

    skipNext() {
        if (this.repeat === Repeat.REPEAT_ONE)
            this.next(true)
        else
            this.next()
    }

    skipPrev() {
        this.prev()
    }

    volume(volume) {
        this.audio.volume = volume
    }

    get hasSrc() {
        return !!this.audio.src
    }

    get isPaused() {
        return this.audio.paused
    }

    isActivePlaylist(renderer) {
        const a = Object.assign({}, renderer)
        const b = Object.assign({}, this.renderer)
        a.filter = undefined
        b.filter = undefined
        return isEqualObject(renderer, this.renderer)
    }
}

module.exports = Controller

const { createElement, createIcon, changeIcon } = require('../lib/query')
const { Icon, Repeat, Event, toDurationString } = require('../lib/common')
const { getProgress, getValue } = require('kasarda/node/common')


class Footer {
    constructor(outlet, model, view, controller, mainOutlet) {
        this.state = outlet.state
        this.model = model
        this.view = view
        this.controller = controller
        this.mainOutlet = mainOutlet
        this.nodes = {}
    }

    setRepeat() {
        switch (this.controller.repeat) {
            case Repeat.REPEAT:
                changeIcon(this.nodes.repeat, Icon.REPEAT)
                this.nodes.repeat.classList.remove('inactive')
                this.controller.repeat = Repeat.REPEAT
                break
            case Repeat.REPEAT_ONE:
                changeIcon(this.nodes.repeat, Icon.REPEAT_ONE)
                this.nodes.repeat.classList.remove('inactive')
                this.controller.repeat = Repeat.REPEAT_ONE
                break
            case Repeat.NOREPEAT:
                changeIcon(this.nodes.repeat, Icon.REPEAT)
                this.nodes.repeat.classList.add('inactive')
                this.controller.repeat = Repeat.NOREPEAT
                break
        }
    }

    setShuffle() {
        if (this.controller.shuffle)
            this.nodes.shuffle.classList.remove('inactive')
        else
            this.nodes.shuffle.classList.add('inactive')
    }

    playButton() {
        changeIcon(this.nodes.play, Icon.PLAY)
    }

    pauseButton() {
        changeIcon(this.nodes.play, Icon.PAUSE)
    }

    setFav() {
        changeIcon(this.nodes.fav, Icon.FAVORITE)
    }

    unsetFav() {
        changeIcon(this.nodes.fav, Icon.FAVORITE_BORDER)
    }

    render(state) {
        this.state = state

        // Shuffle

        const shuffle = createIcon(Icon.SHUFFLE + '.small')
        this.nodes.shuffle = shuffle

        this.setShuffle()
        shuffle.addEventListener('click', _ => {
            this.controller.shuffle = !this.controller.shuffle
            this.setShuffle()
        })




        // Repeat
        const repeat = createIcon('.small')
        this.nodes.repeat = repeat
        this.setRepeat()
        repeat.addEventListener('click', _ => {
            switch (this.controller.repeat) {
                case Repeat.REPEAT:
                    this.controller.repeat = Repeat.REPEAT_ONE
                    break
                case Repeat.REPEAT_ONE:
                    this.controller.repeat = Repeat.NOREPEAT
                    break
                case Repeat.NOREPEAT:
                    this.controller.repeat = Repeat.REPEAT
                    break
            }
            this.setRepeat()
        })




        // Playlist link
        const playlistLink = createIcon(Icon.QUEUE + '.small')
        playlistLink.addEventListener('click', _ => {
            const { component, type, prop, filter } = this.controller.renderer

            if (component)
                this.view.render(component, type, prop, filter)
        })






        // Volume
        const volume = this.view.component.Progress({
            state: this.controller.audio.volume,
            icon: prog => {

                if (typeof prog.data.off === 'undefined') {
                    prog.data.off = this.model.def.volumeOff
                }

                if (prog.data.off) {
                    prog.data.off = false
                    return Icon.VOLUME_OFF
                }
                else if (prog.state === 0) {
                    return Icon.VOLUME_MUTE
                }
                else if (prog.state > .75) {
                    return Icon.VOLUME_UP
                }
                return Icon.VOLUME_DOWN
            },

            onIconClicked: prog => {
                if (prog.state === 0) {
                    prog.setState(prog.data.prevState || this.model.def.prevVolume)
                    this.model.setDef({
                        volumeOff: false
                    })
                }
                else {
                    prog.data.prevState = prog.state
                    prog.data.off = true
                    prog.setState(0)
                    this.model.setDef({
                        volumeOff: true,
                        prevVolume: prog.data.prevState
                    })
                }
            }
        })

        volume.addEventListener('change', ({ detail }) => {
            this.controller.volume(detail.state)
        })








        // description
        const artist = createElement()
        const title = createElement()

        this.controller.addEventListener('canplay', _ => {
            const song = this.model.getSong(this.controller.current)
            if (song) {
                artist.innerText = song.metadata.artist
                title.innerText = song.metadata.title
            }
        })



        // main controll
        const play = createIcon(Icon.PLAY + '.large')
        this.nodes.play = play
        const prev = createIcon(Icon.SKIP_PREV)
        const next = createIcon(Icon.SKIP_NEXT)

        prev.addEventListener('click', _ => this.controller.skipPrev())
        next.addEventListener('click', _ => this.controller.skipNext())
        play.addEventListener('click', _ => {
            if (this.controller.current)
                this.controller.toogle()
        })


        this.controller.addEventListener('play', _ => this.pauseButton())
        this.controller.addEventListener('pause', _ => this.playButton())

        this.controller.addEventListener('canplay', _ => {
            if (this.controller.audio.paused)
                this.playButton()

            const song = this.model.getSong(this.controller.current)
            if (song)
                this.view.node.poster.src = song.metadata.picture || ''
        })




        // timeline
        const timeline = this.view.component.Progress({
            state: 0,
            metadata: {
                left: '0:00',
                right: '0:00'
            }
        })

        if (!this.controller.current)
            timeline.disable()

        this.controller.addEventListener('canplay', _ => {
            timeline.disable(false)
            timeline.setState(0)
        })

        this.controller.addEventListener('loadedmetadata', _ => {
            const duration = this.controller.audio.duration
            const right = toDurationString(duration || 0)
            timeline.right(right)
        })

        this.draged = false
        this.controller.addEventListener('timeupdate', _ => {
            if (!this.draged) {
                const duration = this.controller.audio.duration
                const time = this.controller.audio.currentTime
                const prog = getProgress(0, duration, time)
                timeline.setState(prog)

                const left = toDurationString((time || 0))
                timeline.left(left)
            }
        })


        timeline.addEventListener('drag', _ => {
            this.draged = true
        })


        timeline.addEventListener('dragend', ({ detail }) => {
            const value = getValue(0, this.controller.audio.duration, detail.state)
            this.controller.audio.currentTime = value
            this.draged = false
        })


        // favorite
        const fav = createIcon(Icon.FAVORITE_BORDER)
        this.nodes.fav = fav

        fav.addEventListener('click', _ => {
            if (this.controller.current)
                this.model.toogleFav(this.controller.current)
        })

        this.controller.addEventListener('canplay', _ => {
            const isFav = this.model.isFav(this.controller.current)
            if (isFav)
                this.setFav()
            else
                this.unsetFav()
        })

        this.model.addEventListener(Event.ADD_FAV, (err, song) => {
            if (!err) {
                if (song.id === this.controller.current)
                    this.setFav()
            }
        })

        this.model.addEventListener(Event.REMOVE_FAV, (err, song) => {
            if (!err) {
                if (song.id === this.controller.current)
                    this.unsetFav()
            }
        })



        // Play next song if played is removed
        // todo add this functionality to controller
        this.model.addEventListener(Event.REMOVE_SONG, (err, song) => {
            if (!err) {
                if (this.controller.current === song.id) {
                    const len = this.controller.queueList.length
                    const IDs = this.controller.queueList.map(queueSong => queueSong.id)
                    let index = IDs.indexOf(song.id) + 1

                    if (index >= len)
                        index = (len - 1) - 1

                    const nextSong = this.controller.queueList[index]
                    if ((len > 0) && nextSong)
                        this.controller.play(nextSong.id, true)
                    else
                        this.controller.clearSong()
                }
            }
        })


        // Clear data
        this.controller.addEventListener('clear', _ => {
            artist.innerText = ''
            title.innerText = ''
            this.playButton()
            timeline.left('0:00')
            timeline.right('0:00')
            timeline.setState(0)
            timeline.disable()
            this.unsetFav()
            this.controller.renderer = {}
            this.controller.current = null
        })

        return createElement('.footer', {
            child: [
                createElement('aside', {
                    child: createElement('.wrapper', {
                        child: [
                            createElement('.controllers', {
                                child: [
                                    shuffle,
                                    repeat,
                                    playlistLink
                                ]
                            }),
                            volume
                        ]
                    })
                }),
                createElement('section', {
                    child: createElement('.wrapper', {
                        child: [
                            createElement('.description', {
                                child: createElement('.title', {
                                    child: [
                                        artist,
                                        title
                                    ]
                                })
                            }),
                            createElement('.timeline', {
                                child: [
                                    createElement('.controllers', {
                                        child: [
                                            prev,
                                            play,
                                            next
                                        ]
                                    }),
                                    timeline
                                ]
                            }),
                            createElement('.fav', {
                                child: fav
                            })
                        ]
                    })
                })
            ]
        })
    }
}


module.exports = Footer
const { createElement, createIcon, Icon, Ev, getArraySurrounding, Render, changeIcon } = require('../lib/common')

let _run = true
class Fullscreen extends HTMLElement {
    constructor(model, view, controller) {
        super()
        this.hidden = true
        this.model = model
        this.view = view
        this.controller = controller
        this.itemIDs = []
        this.items = []
        this.isOpen - false

        this.controller.on(Ev.PLAY, _ => {
            if (this.isOpen)
                this.update()
        })

        this.controller.on(Ev.SET_QUEUE, _ => {
            if (this.isOpen) {
                this.create()
                this.update()
            }
        })

        this.slider = createElement('.slider')

        createElement('.slide', {
            append: this,
            child: [
                createIcon(Icon.ARROW_LEFT, {
                    on: {
                        click: _ => this.controller.prev()
                    }
                }),
                createElement('.slider-container', [
                    this.slider
                ]),
                createIcon(Icon.ARROW_RIGHT, {
                    on: {
                        click: _ => this.controller.next()
                    }
                }),
            ]
        })

        document.body.appendChild(this)
    }



    update() {
        this.items.forEach(item => {
            item.classList.remove('active')
            if (item.dataset.id === this.controller.currentID)
                item.classList.add('active')
        })

        this.centerActive()
    }

    centerActive() {
        const dis = this.getCenterDistance(this.itemIDs, this.controller.currentID)

        this.slider.attributeStyleMap.set('transform', new CSSTransformValue([
            new CSSTranslate(CSS.percent(dis * (100 / 3)), CSS.px(0))
        ]))

    }

    getCenterDistance(arr, target) {
        const current = arr.indexOf(target)
        if (current >= 0)
            return -(current - 1)

        return 0
    }


    createItem(id, active) {
        const song = this.model.getSongByID(id)

        if (!song)
            return null

        const { title, cover, artists } = song.metadata

        return createElement('.song-wrapper', {
            className: active ? 'active' : null,
            data: { id },
            child: [
                createElement('.song-cover', {
                    child: [
                        createElement('img', {
                            src: cover
                        }, cover)
                    ],
                    on: {
                        click: _ => this.controller.play(song.id)
                    }
                }),
                createElement('.song-info', [
                    createElement('.title', {
                        text: title || ''
                    }),
                    createElement('.artist', artists.map(artist => createElement('span', {
                        text: artist,
                        on: {
                            click: _ => this.view.Node.outlet.render(Render.ARTIST(artist), artist)
                        }
                    })))
                ])
            ]
        })
    }

    watchMoving() {
        document.body.dataset.moving = false
        document.addEventListener('mousemove', this._movingListener)
    }

    unwatchMoving() {
        document.removeEventListener('mousemove', this._movingListener)
    }

    open() {
        if (this.controller.queue.length) {
            changeIcon(this.view.Node.fullscreen, Icon.FULLSCREEN_EXIT)
            this.hidden = false
            this.isOpen = true
            this.create()
            document.body.classList.add('fullscreen')
            this.watchMoving()
            this.view.currentWindow.setFullScreen(true)
        }
    }

    close() {
        changeIcon(this.view.Node.fullscreen, Icon.FULLSCREEN)
        this.hidden = true
        this.isOpen = false
        this.slider.innerHTML = ''
        document.body.classList.remove('fullscreen')
        this.unwatchMoving()
        this.view.currentWindow.setFullScreen(false)
    }

    toggle() {
        if (!this.isOpen)
            this.open()
        else
            this.close()
    }

    create() {
        this.itemIDs = this.controller.queueIDs
        this.slider.innerHTML = ''
        this.items = this.itemIDs.map(id => this.createItem(id, this.controller.currentID === id))
        this.items.forEach(item => this.slider.appendChild(item))
        this.centerActive()
    }

    _movingListener() {
        document.body.dataset.moving = true
        if (_run) {
            setTimeout(_ => {
                document.body.dataset.moving = false
                _run = true
            }, 2000)
        }
        _run = false
    }
}

customElements.define('fullscreen-component', Fullscreen)
module.exports = Fullscreen
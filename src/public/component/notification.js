const { createElement } = require('../lib/query')
const { getImmutable } = require('../lib/common')

const default_option = {
    message: '',
    undo: false,
    alert: false,
    delay: 2000,
}

let queue = []

class NotificationComponent extends HTMLElement {
    constructor(option = default_option) {
        super()

        // Properties
        this.option = getImmutable(default_option, option)
        this._openEvent = new CustomEvent('open', {})
        this._closeEvent = new CustomEvent('close', {})

        // Queue
        this._queue_id = queue.push(this)

        if(this._queue_id > 1) {
            queue[this._queue_id - 2].addEventListener('close', _ => {
                this.open()
            })
        }
        else {
            this.open()
        }

        // Text
        const text = createElement('span', {
            text: this.option.message,
        })

        this.appendChild(text)

        // Undo
        if (this.option.undo) {

            const undoEvent = new CustomEvent('undo')
            const undoButton = createElement('button', {
                text: 'undo'
            })

            undoButton.addEventListener('click', _ => {
                this.dispatchEvent(undoEvent)
                this.close()
            })

            this.appendChild(undoButton)
        }

        // Alert
        if (this.option.alert)
            this.dataset.alert = true
    }


    open() {
        this.dataset.open = true
        this.dispatchEvent(this._openEvent)
        // Delay
        this.timer = setTimeout(_ => {
            this.close()
        }, this.option.delay)
    }

    close() {
        clearTimeout(this.timer)
        this.dataset.hide = true
        this.addEventListener('animationend', event => {
            if (/--remove/.test(event.animationName)) {
                this.remove()
                queue = queue.filter(notification => notification !== this)
                this.dispatchEvent(this._closeEvent)
            }
        })
    }
}

customElements.define('notification-component', NotificationComponent)
module.exports = NotificationComponent

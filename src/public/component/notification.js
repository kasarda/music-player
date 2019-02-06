class Notification extends HTMLElement {
    constructor(option = {
        title,
        time: null
    }) {
        super()
        this._title = option.title
        this._time = option.time
        this._id = Date.now()
    }

    open(title) {
        if (title)
            this._title = title
            
        if (!this.offsetParent) {
            this.innerText = this._title
            document.body.appendChild(this)

            if (typeof this._time === 'number')
                setTimeout(_ => this.close(), this._time)
        }
    }

    close() {
        this.classList.add('close')
        this.addEventListener('animationend', e => {
            if (e.animationName === 'notification-out') {
                this.remove()
                this.classList.remove('close')
            }
        })
    }
}

customElements.define('notification-component', Notification)
module.exports = Notification
const { createElement, createIcon, changeIcon } = require('../lib/common')
const Interaction = require('kasarda/node/interaction')
const { getProgress, getValue } = require('kasarda/node/common')

class Timeline extends HTMLElement {
    constructor(options) {
        super()

        this.disabled = false

        this.state = options.state || 0
        this.icon = options.icon
        this.text = options.text || []
        this._changeEvent = new CustomEvent('change', { detail: {} })
        this._dragEvent = new CustomEvent('drag', { detail: {} })
        this._iconEvent = new CustomEvent('icon', { detail: {} })

        this.wrapper = createElement('.timeline-wrapper', { append: this })
        const progress = createElement('.timeline-progress', { append: this.wrapper })
        this.bar = createElement('.timeline-bar', { append: progress })
        const thumb = createElement('.timeline-thumb', { append: this.bar })


        this.start = createElement('span')
        this.end = createElement('span')
        this.iconElement = createIcon(this.icon)
        this.iconElement.addEventListener('click', _ => {
            this._iconEvent.detail.state = this.state
            this.dispatchEvent(this._iconEvent)
        })

        if (typeof this.text[0] === 'string')
            this.insertBefore(this.start, this.firstChild || null)

        if (typeof this.text[1] === 'string')
            this.appendChild(this.end)

        if (this.icon)
            this.insertBefore(this.iconElement, this.firstChild || null)

        this.setText(this.text[0], this.text[1])

        this.draged = false

        new Interaction({
            drag: e => {
                if (e.path.includes(this.wrapper) && !this.disabled) {
                    const state = this._getState(e.move.clientX)
                    this._updateBar(state)
                    this._dragEvent.detail.state = state
                    this.dispatchEvent(this._dragEvent)
                }
            },
            start: e => {
                if (e.path.includes(this.wrapper) && !this.disabled) {
                    const state = this._getState(e.clientX)
                    this._updateBar(state)
                    this.draged = true
                    this._dragEvent.detail.state = state
                    this.dispatchEvent(this._dragEvent)
                }
            },

            end: e => {
                if (this.draged && !this.disabled) {
                    const state = this._getState(e.clientX)
                    this.draged = false
                    this.setState(state)
                }
            }
        })

        if (this.state)
            this.setState(this.state)
    }

    setState(state, dispach = true) {
        if (!this.draged) {
            state = this._minmax(state)

            this.state = state
            this._updateBar(state)

            if (dispach) {
                this._changeEvent.detail.state = this.state
                this.dispatchEvent(this._changeEvent)
            }
        }
    }

    setText(start, end) {
        if (this._isText(start))
            this.start.innerText = start + ''
        if (this._isText(end))
            this.end.innerText = end
    }

    setIcon(icon) {
        if (typeof icon === 'string')
            changeIcon(this.iconElement, icon)
    }

    setDisable(disable = true) {
        this.disabled = disable
    }

    _updateBar(state) {
        const width = getValue(0, 100, state)

        if (Number.isFinite(width)) {
            this.bar.attributeStyleMap.set('width', CSS.percent(width))
            this.barState = state
        }
    }

    _minmax(value) {
        return Math.min(Math.max(value, 0), 1)
    }

    _getState(clientX) {
        const { x, width } = this.wrapper.getBoundingClientRect()
        const styles = getComputedStyle(this.wrapper)
        const left = Number.parseFloat(styles.paddingLeft)
        const right = Number.parseFloat(styles.paddingRight)

        const max = (width - (left + right)) + x
        const value = clientX - left

        return getProgress(x, max, value)
    }

    _isText(value) {
        return ['string', 'number'].includes(typeof value)
    }
}



customElements.define('timeline-component', Timeline)
module.exports = Timeline

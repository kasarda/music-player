const { createElement, createIcon, Icon } = require('../lib/common')
const cloneDeep = require('lodash/cloneDeep')

class Select extends HTMLElement {
    constructor() {
        super()
        this._wrapper
        this._closeEvent = new CustomEvent('close', {})
        this._openEvent = new CustomEvent('open', {})
        document.body.appendChild(this)

        document.body.addEventListener('mousedown', e => {
            if (!e.path.includes(this) && this._wrapper)
                this.close()
        })

    }

    _getValue(value) {
        if (typeof value === 'function')
            return value()
        else
            return value
    }

    _createItem(option) {
        const title = this._getValue(option.title)
        const disabled = this._getValue(option.disabled)
        const sub = this._getValue(option.sub)
        const visible = this._getValue(option.visible)

        if (!(visible === false)) {
            return createElement('.select-item', {
                text: title,
                className: disabled ? 'disabled' : '',
                child: sub ? [
                    createIcon(Icon.ARROW_RIGHT),
                    createElement('.select-sup', {
                        child: sub.map(subOption => this._createItem(subOption))
                    })
                ] : null,
                on: {
                    click: e => {
                        if (typeof option.onClick === 'function' && !disabled) {
                            option.onClick.call(this, e)
                            this.close()
                        }

                    }
                }
            })
        }
    }

    open(options, top = 0, left = 0) {
        if (this._wrapper)
            this._wrapper.remove()

        options = cloneDeep(options)
        const items = []
        for (const option of options) {
            const item = this._createItem(option)
            if (item)
                items.push(item)
        }

        this._wrapper = createElement('.select-wrapper', {
            append: this,
            child: items,
        })


        const style = getComputedStyle(this)
        const width = parseFloat(style.width)
        const height = parseFloat(style.height)
        const maxWidth = window.innerWidth
        const maxHeight = window.innerHeight

        if ((left + width * 2) > maxWidth)
            this._wrapper.classList.add('left')

        const subHeight = Math.max(options.map(option => option.sub && option.sub.length).filter(a => a)) * 45

        if ((top + subHeight + height) > maxHeight)
            this._wrapper.classList.add('top')

        if ((left + width) > maxWidth)
            left = maxWidth - width - 15

        if ((top + height) > maxHeight)
            top = maxHeight - height - 15

        this.attributeStyleMap.set('left', CSS.px(left))
        this.attributeStyleMap.set('top', CSS.px(top))

        this.dispatchEvent(this._openEvent)
        document.documentElement.dataset.select = true
    }

    close() {
        this._wrapper.remove()
        this.dispatchEvent(this._closeEvent)
        delete document.documentElement.dataset.select
    }
}




customElements.define('select-component', Select)
module.exports = Select
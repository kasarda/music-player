const { createElement, createIcon } = require('../lib/query')
const { Icon } = require('../lib/common')

class SelectComponent extends HTMLElement {
    constructor(items = [], data) {
        super()
        this.items = items
        this._open = false
        this.data = data

        this.content = createElement('div')
        const icon = createIcon(Icon.MORE_HORIZ)

        icon.addEventListener('click', _ => this.toggle())

        this.appendChild(icon)
        this.appendChild(this.content)

        window.addEventListener('click', event => {
            if (!event.path.includes(this))
                this.close()
        })
    }

    open() {
        this._open = true
        const select = this._createSelect(this.items)
        this.content.appendChild(select)
    }

    close() {
        this._open = false
        this.content.innerHTML = ''
    }

    toggle() {
        if (!this._open) {
            this.open()
            this._open = true
        }

        else {
            this.close()
            this._open = false
        }

    }

    _createSelect(items, wrapperClassName = '') {
        const content = createElement('article', {
            className: wrapperClassName
        })

        items.forEach(item => {
            if (item.create !== false) {
                const text = createElement('span.item-text')
                const icon = createIcon(`${item.icon || ''}.small`)
                text.appendChild(icon)
                const span = createElement('span', {
                    text: typeof item.text === 'function' ? item.text(this) : item.text
                })
                text.appendChild(span)


                const itemElement = createElement('.item', {
                    child: text
                })

                const disabled = typeof item.disabled === 'function' ? item.disabled(this) : item.disabled
                if (!disabled) {
                    itemElement.addEventListener('click', _ => {
                        if (item.action) {
                            this.close()
                            item.action(this, itemElement)
                        }
                    })
                }
                else {
                    itemElement.classList.add('disabled')
                }

                const sub = typeof item.sub === 'function' ? item.sub(this) : item.sub
                if (sub) {
                    const arrow = createIcon(Icon.ARROW_RIGHT + '.small')
                    itemElement.appendChild(arrow)
                    itemElement.classList.add('subitem')

                    const subWrapper = this._createSelect(sub, 'subwrapper')
                    itemElement.appendChild(subWrapper)
                }
                content.appendChild(itemElement)
            }
        })
        return content
    }
}

customElements.define('select-component', SelectComponent)
module.exports = SelectComponent
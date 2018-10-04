const { createElement } = require('../lib/query')

const default_option = {
    state: false,
    label: null
}

class SwitchComponent extends HTMLElement {
    constructor(option = default_option) {
        super()
        this.state = option.state || default_option.state
        this.label = option.label
        this._setDataset(this.state)
        this._switchEvent = new CustomEvent('switch', { detail: {} })
        if (this.label) {
            this.dataset.label = true
            const labelElement = createElement('.label', {
                text: this.label
            })

            this.appendChild(labelElement)
        }

        const switchElement = createElement('.switch')
        const stateElement = createElement('.state')
        switchElement.appendChild(stateElement)

        this.addEventListener('click', _ => {
            this.toggle()
        })

        this.appendChild(switchElement)
    }

    on() {
        this.setState(true)
    }

    off() {
        this.setState(false)
    }

    toggle() {
        this.setState(!this.state)
    }

    setState(state) {
        this.state = state
        this._setDataset(state)
        this._switchEvent.detail.state = state
        this.dispatchEvent(this._switchEvent)
    }

    _setDataset(state) {
        if (state) {
            delete this.dataset.off
            this.dataset.on = ''
        }
        else {
            delete this.dataset.on
            this.dataset.off = ''
        }
    }
}

customElements.define('switch-component', SwitchComponent)
module.exports = SwitchComponent
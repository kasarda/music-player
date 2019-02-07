const { createElement } = require('../lib/common')

class Radio extends HTMLElement {
    constructor(options) {
        super()
        const active = options.filter(a => a.active)[0]
        this.value = active && active.value
        this.changeEvent = new CustomEvent('change', { detail: {} })

        for (const option of options) {
            createElement('.option-radio', {
                className: option.active ? 'active' : null,
                data: {
                    value: option.value
                },
                child: [
                    createElement('.circle'),
                    createElement('span', { text: option.label })
                ],
                on: {
                    click: _ => this.setValue(option.value)
                },
                append: this
            })
        }
    }

    setValue(value) {
        if (this.value !== value) {
            this.value = value

            const radios = this.querySelectorAll('.option-radio')
            radios.forEach(radio => {
                radio.classList.remove('active')
                if (radio.dataset.value === value)
                    radio.classList.add('active')
            })

            this.changeEvent.detail.value = this.value
            this.dispatchEvent(this.changeEvent)
        }
    }

}


customElements.define('radio-component', Radio)
module.exports = Radio
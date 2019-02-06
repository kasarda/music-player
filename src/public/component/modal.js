const { createElement, createIcon, Icon } = require('../lib/common')

class Modal extends HTMLElement {
    constructor(option = {
        title: null,
        label: null,
        confirm: 'Confirm',
        type: 'input'
    }) {
        super()

        this.confirmEvent = new CustomEvent('confirm', {
            detail: {}
        })


        this.type  = option.type

        this.input = createElement('input', {
            prop: {
                type: 'text',
                placeholder: option.label,
                value: ''
            },
            attr: {
                id: 'modal-input'
            },
            on: {
                keydown: (e, elem) => {
                    if(elem.value !== '' && e.code === 'Enter')
                        this.confirm()
                }
            }
        })

        const closeIcon = createIcon(Icon.CLOSE, { className: Icon.size.SMALL })
        closeIcon.addEventListener('click', _ => this.close())

        createElement('.modal', {
            append: this,
            className: this.type,
            child: [
                closeIcon,
                createElement('.modal-title', {
                    text: option.title
                }),
                this.type  !== 'confirm' ? createElement('.modal-body', [this.input]) : null,
                createElement('.modal-footer', {
                    child: [
                        createElement('button.confirm', {
                            text: option.confirm,
                            on: {
                                click: _ => this.confirm(),
                            }
                        }),

                        createElement('button.cancel', {
                            text: 'Cancel',
                            on: {
                                click: _ => this.close(),
                            }
                        })
                    ]
                })
            ]
        })

        this.addEventListener('click', e => {
            if (e.target === this)
                this.close()
        })

    }

    open() {
        document.body.appendChild(this)
        this.input.value = ''
        this.input.focus()
    }

    close() {
        this.remove()
    }

    confirm() {
        if (this.type === 'confirm')
            this.confirmEvent.detail.value = true
        else
            this.confirmEvent.detail.value = this.input.value
        this.dispatchEvent(this.confirmEvent)
        this.close()
    }
}


customElements.define('modal-component', Modal)
module.exports = Modal
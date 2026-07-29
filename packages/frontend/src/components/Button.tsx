import { MouseEventHandler } from 'react'

type Props = {
    onClick: MouseEventHandler,
    color?: string,
    text: string,
  }

const Button = ({onClick, color = 'steelblue', text}: Props) => {
    return <button onClick={onClick} style={{backgroundColor: color}} type='button' className='btn'> {text} </button>
}

export default Button

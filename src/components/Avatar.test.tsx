// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

afterEach(cleanup)

describe('Avatar', () => {
  it('menampilkan foto bila ada', () => {
    render(<Avatar user={{ name: 'DEA SAKA KURNIA PUTRA', foto: '/foto/dea.webp' }} />)
    expect(screen.getByRole('img', { name: 'Foto DEA SAKA KURNIA PUTRA' }).getAttribute('src')).toBe('/foto/dea.webp')
  })
  it('jatuh ke inisial bila tanpa foto', () => {
    const { container } = render(<Avatar user={{ name: 'AKUN DEMO DOSEN' }} />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.textContent).toBe('AD')
  })
})

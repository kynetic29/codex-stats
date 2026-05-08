const { Tray, Menu, nativeImage } = require('electron')

let tray = null

function createTray(mainWindow, app) {
  const icon = nativeImage.createFromBuffer(Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAV0lEQVQ4T2NkIBIwEqmOYQCD/3+M4P///0fQ0NAwGgZGBob/DAwM/4dR0f8ZGBj+M2BgYHzi0wBqGhoa/hsGBgaGfwxMTAz/GWBgYHyKQYOQJgYGBkYGABQSA3vN7CkzAAAAAElFTkSuQmCC',
    'base64'
  ))

  tray = new Tray(icon)
  tray.setToolTip('CodexStats')
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Show Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    {
      label: 'Hide Dashboard',
      click: () => {
        if (mainWindow) mainWindow.hide()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]))

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  return tray
}

function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

module.exports = { createTray, destroyTray }

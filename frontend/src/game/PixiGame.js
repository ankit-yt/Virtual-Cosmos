import * as PIXI from 'pixi.js'
import { socket } from './socket.js'

const SPEED = 10
const PROXIMITY_RADIUS = 150
const WORLD_W = 1400
const WORLD_H = 750

// ─── Palette ──────────────────────────────────────────────────────────────────
const P = {
  grass:      0x4a7c45,
  treeTrunk:  0x6b4226,
  treeLeaf:   0x2d6e2d,
  treeLeafD:  0x245c24,
  treeLeafL:  0x3a8c3a,
  floor:      0xc8a96e,
  wallTop:    0x6b5e44,
  wall:       0x8c7a5a,
  deskTop:    0xa07830,
  deskBody:   0x8B6914,
  deskDark:   0x6B5010,
  chair:      0x555555,
  chairDark:  0x333333,
  carpet:     0xd4b896,
  path:       0xd9ba82,
  pathEdge:   0xc4a56d,
  monitor:    0x222222,
  monitorScr: 0x1a3a5c,
  plantPot:   0x7a4a2a,
  plantLeaf:  0x3a8a3a,
  plantLeafL: 0x4aaa4a,
  sofa:       0xc4824a,
  sofaDark:   0xa06030,
  sofaLight:  0xd4925a,
  rug:        0x8b3a3a,
  rugBorder:  0x6b2a2a,
  tableWood:  0xa08850,
  tableDark:  0x806830,
  lounge:     0xd4c090,
  loungeDrk:  0xb0a070,
  labelBg:    0x000000,
  roomBg:     0xbfa878,
  roomBorder: 0x8a7a58,
  roomInner:  0xc8aa68,
  panelBg:    0xd0b880,
  panelDrk:   0xb09860,
  skin:       0xf5c8a0,
  hair:       0x2a1a0a,
  shoe:       0x111111,
  eyeWhite:   0xffffff,
  eyePupil:   0x333333,
  shadowClr:  0x000000,
}

export class PixiGame {
  constructor(container,playerName, onProximityChange, onPlayerCountChange) {
    this.container = container
    this.playerName = playerName
    this.onProximityChange = onProximityChange
    this.onPlayerCountChange = onPlayerCountChange
    this.players = {}
    this.myId = socket.id ?? null
    this.keys = {}
    this.isTyping = false
    this.currentNearest = null
    this._animTime = 0

    this.init()
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  async init() {
    this.app = new PIXI.Application()

    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1a2e,
      resizeTo: window,
      antialias: false,
    })

    this.container.appendChild(this.app.canvas)

    // Root world container (everything scrolls inside this)
    this.world = new PIXI.Container()
    this.app.stage.addChild(this.world)

    // Layered containers for correct draw order
    this.layerGround  = new PIXI.Container() // floor, grass, walls
    this.layerFurni   = new PIXI.Container() // desks, chairs, plants
    this.layerRooms   = new PIXI.Container() // room outlines & labels
    this.layerChars   = new PIXI.Container() // avatars (sorted by Y each frame)

    this.world.addChild(this.layerGround)
    this.world.addChild(this.layerFurni)
    this.world.addChild(this.layerRooms)
    this.world.addChild(this.layerChars)

    this.cam = { x: 0, y: 0 }

    this.drawWorld()
    this.setupMyPlayer()
    this.setupKeyboard()
    this.setupSocketListeners()
    this.zoom = 1

    this.app.ticker.add((ticker) => this.gameLoop(ticker.deltaMS / 1000))
  }

  // ─── World drawing ─────────────────────────────────────────────────────────

  drawWorld() {
    this._drawGround()
    this._drawWalls()
    this._drawPrivateRooms()
    this._drawCorridor()
    this._drawOpenOffice()
    this._drawRightSection()
    this._drawBottomLeftRooms()
  }

  _drawGround() {
    const g = new PIXI.Graphics()

    // Grass border
    g.rect(0, 0, WORLD_W, WORLD_H).fill(P.grass)

    // Inner floor
    g.rect(40, 40, WORLD_W - 80, WORLD_H - 80).fill(P.floor)

    // Tile grid
    const ts = 32
    for (let x = 40; x < WORLD_W - 40; x += ts) {
      g.moveTo(x, 40).lineTo(x, WORLD_H - 40)
        .stroke({ color: 0x000000, alpha: 0.05, width: 1 })
    }
    for (let y = 40; y < WORLD_H - 40; y += ts) {
      g.moveTo(40, y).lineTo(WORLD_W - 40, y)
        .stroke({ color: 0x000000, alpha: 0.05, width: 1 })
    }

    this.layerGround.addChild(g)

    // Trees around border
    for (let x = 0; x < WORLD_W; x += 32) {
      this.layerGround.addChild(this._makeTree(x, 2))
      this.layerGround.addChild(this._makeTree(x, WORLD_H - 28))
    }
    for (let y = 28; y < WORLD_H - 28; y += 32) {
      this.layerGround.addChild(this._makeTree(2, y))
      this.layerGround.addChild(this._makeTree(WORLD_W - 18, y))
    }
  }

  _drawWalls() {
    const g = new PIXI.Graphics()

    // Wall top (dark cap)
    g.rect(40, 40, WORLD_W - 80, 40).fill(P.wallTop)

    // Wall face
    g.rect(40, 60, WORLD_W - 80, 30).fill(P.wall)

    // Brick lines
    for (let x = 40; x < WORLD_W - 40; x += 36) {
      g.moveTo(x, 60).lineTo(x, 90)
        .stroke({ color: 0x000000, alpha: 0.12, width: 1 })
    }

    this.layerGround.addChild(g)
  }

  _drawPrivateRooms() {
    const rw = 155, rh = 115
    const labels = ['Room 2','Room 3','Room 4','Room 5','Room 6','Room 7']
    let ri = 0
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const rx = 44 + col * (rw + 4)
        const ry = 95 + row * (rh + 6)
        this.layerRooms.addChild(this._makeRoom(rx, ry, rw, rh, labels[ri++]))
        this.layerFurni.addChild(this._makeDesk(rx + 52, ry + 38, 50, 26))
      }
    }
  }

  _drawCorridor() {
    const g = new PIXI.Graphics()
    // Path fill
    g.rect(358, 95, 42, WORLD_H - 135).fill(P.path)
    // Dashed edges
    g.moveTo(358, 95).lineTo(358, WORLD_H - 40)
      .stroke({ color: P.pathEdge, width: 1 })
    g.moveTo(400, 95).lineTo(400, WORLD_H - 40)
      .stroke({ color: P.pathEdge, width: 1 })
    this.layerGround.addChild(g)
  }

  _drawOpenOffice() {
    const ids = Array.from({ length: 25 }, (_, i) => `A${i + 1}`)
    let di = 0
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const dx = 412 + col * 57
        const dy = 100 + row * 108
        // Facing-up desk
        this.layerFurni.addChild(this._makeDeskTop(dx, dy, 44, 24))
        // Facing-down desk
        this.layerFurni.addChild(this._makeDesk(dx, dy + 44, 44, 24))
        // Label
        this.layerFurni.addChild(this._makeLabel(dx + 22, dy + 79, ids[di++], true))
      }
    }
  }

  _drawRightSection() {
    const rsx = 930

    // ── Lounge area ──
    const lounge = new PIXI.Graphics()
    lounge.roundRect(rsx, 95, 290, 195, 4).fill(P.lounge)
      .stroke({ color: P.loungeDrk, width: 1 })

    // Rug
    lounge.roundRect(rsx + 20, 115, 150, 90, 6).fill(P.rug)
      .stroke({ color: P.rugBorder, width: 2 })

    // Round coffee table
    lounge.circle(rsx + 125, 165, 20).fill(P.tableWood)
      .stroke({ color: P.tableDark, width: 1 })

    this.layerFurni.addChild(lounge)

    // Sofas
    this.layerFurni.addChild(this._makeSofa(rsx + 30, 125, 70, 28))
    this.layerFurni.addChild(this._makeSofa(rsx + 30, 175, 70, 28))

    // Plants
    for (let i = 0; i < 3; i++) {
      this.layerFurni.addChild(this._makePlant(rsx + 168 + i * 17, 118))
    }

    // Gathering space label
    const gLabel = this._makeRoomLabel(rsx + 200, 100, 'Gathering space', 90)
    this.layerRooms.addChild(gLabel)

    // Right desks
    for (let c = 0; c < 2; c++) {
      this.layerFurni.addChild(this._makeDeskTop(rsx + 160 + c * 60, 95, 44, 26))
      this.layerFurni.addChild(this._makeDesk(rsx + 160 + c * 60, 155, 44, 26))
    }

    // ── Discussion clusters (bottom right) ──
    const bry = WORLD_H - 200
    const discPositions = [
      [rsx, bry], [rsx + 175, bry],
      [rsx, bry + 80], [rsx + 175, bry + 80],
    ]
    discPositions.forEach(([x, y], i) => {
      this.layerFurni.addChild(this._makeDiscussionCluster(x, y, `DR${i * 3 + 1}`))
    })

    // ── Right panel rooms ──
    const panels = [
      { y: 220, h: 90,  label: 'Discussion Room 15' },
      { y: 320, h: 70,  label: 'Discussion Room 7'  },
      { y: 400, h: 70,  label: 'Chilling Room 11'   },
    ]
    panels.forEach(({ y, h, label }) => {
      const g = new PIXI.Graphics()
      g.roundRect(rsx + 210, y, 120, h, 4).fill(P.panelBg)
        .stroke({ color: P.panelDrk, width: 1 })
      this.layerRooms.addChild(g)
      this.layerRooms.addChild(this._makeRoomLabel(rsx + 212, y + h - 26, label, 116))
    })
  }

  _drawBottomLeftRooms() {
    const rw = 155, rh = 105
    const labels = ['Room 8', 'Room 1']
    for (let col = 0; col < 2; col++) {
      const rx = 44 + col * (rw + 4)
      const ry = 460
      this.layerRooms.addChild(this._makeRoom(rx, ry, rw, rh, labels[col]))
      this.layerFurni.addChild(this._makeDesk(rx + 52, ry + 28, 50, 26))
    }
  }

  // ─── Furniture factories ───────────────────────────────────────────────────

  _makeTree(x, y) {
    const g = new PIXI.Graphics()
    g.rect(x + 5, y + 14, 6, 8).fill(P.treeTrunk)
    g.roundRect(x + 1, y + 4, 14, 14, 4).fill(P.treeLeafD)
    g.roundRect(x, y + 2, 14, 13, 4).fill(P.treeLeaf)
    g.roundRect(x + 2, y, 10, 9, 5).fill(P.treeLeafL)
    return g
  }

  _makeDesk(x, y, w = 50, h = 28) {
    const g = new PIXI.Graphics()
    // Chair (behind desk)
    g.roundRect(x + w / 2 - 9, y + h, 18, 16, 8).fill(P.chair)
      .stroke({ color: P.chairDark, width: 1 })
    // Desk body
    g.roundRect(x, y, w, h, 3).fill(P.deskBody)
      .stroke({ color: P.deskDark, width: 1 })
    // Desk top strip
    g.rect(x + 2, y + 2, w - 4, 6).fill(P.deskTop)
    // Monitor
    g.rect(x + w / 2 - 7, y - 14, 14, 10).fill(P.monitor)
    g.rect(x + w / 2 - 6, y - 13, 12, 8).fill(P.monitorScr)
    g.rect(x + w / 2 - 2, y - 4, 4, 3).fill(P.monitor)
    // Keyboard
    g.roundRect(x + w / 2 - 8, y + 8, 16, 8, 1).fill(0x3a3a3a)
      .stroke({ color: 0x222222, width: 1 })
    return g
  }

  _makeDeskTop(x, y, w = 50, h = 28) {
    const g = new PIXI.Graphics()
    // Chair (above desk)
    g.roundRect(x + w / 2 - 9, y - 18, 18, 16, 8).fill(P.chair)
      .stroke({ color: P.chairDark, width: 1 })
    g.rect(x + w / 2 - 7, y - 18, 14, 3).fill(0x666666)
    // Desk body
    g.roundRect(x, y, w, h, 3).fill(P.deskBody)
      .stroke({ color: P.deskDark, width: 1 })
    g.rect(x + 2, y + h - 8, w - 4, 6).fill(P.deskTop)
    // Monitor
    g.rect(x + w / 2 - 7, y + 4, 14, 10).fill(P.monitor)
    g.rect(x + w / 2 - 6, y + 5, 12, 8).fill(P.monitorScr)
    g.rect(x + w / 2 - 2, y + h - 6, 4, 4).fill(P.monitor)
    // Keyboard
    g.roundRect(x + w / 2 - 8, y + 8, 16, 6, 1).fill(0x3a3a3a)
      .stroke({ color: 0x222222, width: 1 })
    return g
  }

  _makeRoom(x, y, w, h, label) {
    const c = new PIXI.Container()

    const g = new PIXI.Graphics()
    g.roundRect(x, y, w, h, 4).fill(P.carpet)
      .stroke({ color: 0xffffff, alpha: 0.25, width: 1.5 })
    // Inner carpet rings
    for (let i = 0; i < 3; i++) {
      g.roundRect(x + 4 + i * 4, y + 4 + i * 4, w - 8 - i * 8, h - 8 - i * 8, 2)
        .stroke({ color: 0x000000, alpha: 0.06, width: 1 })
    }
    c.addChild(g)
    c.addChild(this._makeRoomLabel(x + 6, y + 5, label, label.length * 6 + 10))
    return c
  }

  _makeRoomLabel(x, y, text, w = 80) {
    const c = new PIXI.Container()
    const bg = new PIXI.Graphics()
    bg.roundRect(x, y, w, 16, 3).fill({ color: 0x000000, alpha: 0.5 })
    c.addChild(bg)
    const t = new PIXI.Text({ text, style: { fontSize: 9, fill: 0xffffff, fontFamily: 'Courier New' } })
    t.x = x + 5
    t.y = y + 3
    c.addChild(t)
    return c
  }

  _makeLabel(cx, cy, text, centered = false) {
    const c = new PIXI.Container()
    const t = new PIXI.Text({ text, style: { fontSize: 7, fill: 0xcccccc, fontFamily: 'Courier New' } })
    t.anchor.set(centered ? 0.5 : 0, 0)
    const bgW = t.width + 6
    const bg = new PIXI.Graphics()
    bg.roundRect(cx - bgW / 2, cy - t.height / 2 - 1, bgW, t.height + 2, 2)
      .fill({ color: 0x000000, alpha: 0.55 })
    t.x = cx
    t.y = cy
    c.addChild(bg)
    c.addChild(t)
    return c
  }

  _makePlant(x, y) {
    const g = new PIXI.Graphics()
    g.roundRect(x, y + 10, 12, 10, 2).fill(P.plantPot).stroke({ color: 0x5a3a1a, width: 1 })
    g.roundRect(x - 2, y + 2, 16, 12, 6).fill(P.plantLeaf).stroke({ color: 0x2a6a2a, width: 1 })
    g.roundRect(x + 2, y - 2, 8, 10, 5).fill(P.plantLeafL).stroke({ color: 0x2a8a2a, width: 1 })
    return g
  }

  _makeSofa(x, y, w = 60, h = 30) {
    const g = new PIXI.Graphics()
    g.roundRect(x, y, w, h, 4).fill(P.sofa).stroke({ color: P.sofaDark, width: 1 })
    g.roundRect(x + 3, y + 3, w - 6, h / 2, 3).fill(P.sofaLight)
    // Arms
    g.roundRect(x, y, 10, h, 4).fill(P.sofaDark)
    g.roundRect(x + w - 10, y, 10, h, 4).fill(P.sofaDark)
    return g
  }

  _makeDiscussionCluster(x, y, baseLabel) {
    const c = new PIXI.Container()
    const bg = new PIXI.Graphics()
    const tw = 164, th = 65
    bg.roundRect(x, y, tw, th, 4).fill(P.roomBg).stroke({ color: P.roomBorder, width: 1 })
    c.addChild(bg)

    for (let i = 0; i < 3; i++) {
      const tx = x + 4 + i * 52
      const ty = y + 4
      const tg = new PIXI.Graphics()
      // Table
      tg.roundRect(tx, ty, 44, 28, 3).fill(P.roomInner).stroke({ color: 0xa08a48, width: 1 })
      // Chairs
      tg.roundRect(tx + 8, ty - 12, 28, 12, 6).fill(P.chair).stroke({ color: P.chairDark, width: 1 })
      tg.roundRect(tx + 8, ty + 32, 28, 12, 6).fill(P.chair).stroke({ color: P.chairDark, width: 1 })
      tg.roundRect(tx - 10, ty + 4, 12, 20, 3).fill(P.chair).stroke({ color: P.chairDark, width: 1 })
      tg.roundRect(tx + 46, ty + 4, 12, 20, 3).fill(P.chair).stroke({ color: P.chairDark, width: 1 })
      c.addChild(tg)

      // Label under table
      const lbl = this._makeLabel(tx + 22, ty + 43, `${baseLabel}-${i + 1}`, true)
      c.addChild(lbl)
    }
    return c
  }

  // ─── Avatar factory ────────────────────────────────────────────────────────

  createAvatar(color, label, isMe = false) {
    const c = new PIXI.Container()
    c._animTimer = Math.random() * Math.PI * 2
    c._label = label
    c._isMe = isMe
    c._color = color
    c._bodyParts = {}

    // Shadow
    const shadow = new PIXI.Graphics()
    shadow.ellipse(0, 26, 12, 4).fill({ color: P.shadowClr, alpha: 0.2 })
    c.addChild(shadow)
    c._bodyParts.shadow = shadow

    // Legs
    const legs = new PIXI.Graphics()
    legs.roundRect(-11, 18, 9, 12, 2).fill(color)
    legs.roundRect(2, 18, 9, 12, 2).fill(color)
    legs.roundRect(-12, 27, 11, 4, 1).fill(P.shoe)
    legs.roundRect(1, 27, 11, 4, 1).fill(P.shoe)
    c.addChild(legs)
    c._bodyParts.legs = legs

    // Body
    const body = new PIXI.Graphics()
    body.roundRect(-12, 0, 24, 20, 3).fill(color)
    c.addChild(body)
    c._bodyParts.body = body

    // Head
    const head = new PIXI.Graphics()
    head.circle(0, -9, 11).fill(P.skin)
    c.addChild(head)
    c._bodyParts.head = head

    // Hair
    const hair = new PIXI.Graphics()
    hair.ellipse(0, -15, 11, 7).fill(P.hair)
    c.addChild(hair)
    c._bodyParts.hair = hair

    // Eyes
    const eyes = new PIXI.Graphics()
    eyes.circle(-3.5, -9, 2).fill(P.eyeWhite)
    eyes.circle(3.5, -9, 2).fill(P.eyeWhite)
    eyes.circle(-3, -8.5, 1).fill(P.eyePupil)
    eyes.circle(4, -8.5, 1).fill(P.eyePupil)
    c.addChild(eyes)
    c._bodyParts.eyes = eyes

    // "You" dot
    if (isMe) {
      const dot = new PIXI.Graphics()
      dot.circle(11, -19, 5).fill(0x22c55e)
      dot.circle(11, -19, 2).fill(0xffffff)
      c.addChild(dot)
    }

    // Name tag
    const nameText = new PIXI.Text({
      text: label,
      style: { fontSize: 9, fill: 0xffffff, fontFamily: 'Courier New', fontWeight: '500' },
    })
    nameText.anchor.set(0.5, 0)
    nameText.x = 0
    nameText.y = 32

    const tagBg = new PIXI.Graphics()
    const bgW = nameText.width + 10
    tagBg.roundRect(-bgW / 2, 32, bgW, 13, 3)
      .fill({ color: isMe ? 0x4f46e5 : 0x000000, alpha: isMe ? 0.85 : 0.6 })
    c.addChild(tagBg)
    c.addChild(nameText)
    c._bodyParts.nameText = nameText
    c._bodyParts.tagBg = tagBg

    return c
  }

  // Animate bob per frame — call in gameLoop
  _animateAvatar(avatar, dt, isMoving = false) {
    if (isMoving || avatar._isMe) {
      avatar._animTimer += dt
    }
    const bob = Math.sin(avatar._animTimer * 8) * (isMoving ? 1.5 : 0.4)
    // Shift body parts vertically for bob
    const parts = ['legs', 'body', 'head', 'hair', 'eyes']
    parts.forEach(k => {
      if (avatar._bodyParts[k]) avatar._bodyParts[k].y = bob
    })
    avatar._bodyParts.shadow.scale.x = 1 - Math.abs(bob) * 0.03
  }

  // ─── My player setup ───────────────────────────────────────────────────────

  setupMyPlayer() {
    this.myPlayer = this.createAvatar(0x6c63ff,this.playerName || 'You', true)
    this.myPlayer.x = 600
    this.myPlayer.y = 380
    this.layerChars.addChild(this.myPlayer)
  }

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  setupKeyboard() {
    this._onKeyDown = (e) => {
      if (this.isTyping) return
      this.keys[e.key] = true
      // Only prevent default for movement keys
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)) {
        e.preventDefault()
      }
    }
    this._onKeyUp = (e) => {
      if (this.isTyping) return
      this.keys[e.key] = false
    }

    this._onWheel = (e) => {
  if (!e.ctrlKey) return

  e.preventDefault()

  const delta = e.deltaY > 0 ? -0.1 : 0.1
  this.zoom = Math.min(2, Math.max(0.4, this.zoom + delta))
}
window.addEventListener('wheel', this._onWheel, { passive: false })
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
  }

  setTypingState(isTyping) {
    this.isTyping = isTyping
    if (isTyping) this.keys = {}
  }

  // ─── Socket listeners ──────────────────────────────────────────────────────

 setupSocketListeners() {
    socket.on('connect', () => {
      this.myId = socket.id
    })

    socket.on('players-update', (users) => {
      this.myId = socket.id

      this.onPlayerCountChange?.(Object.keys(users).length)

      Object.keys(users).forEach((id) => {
        if (id === this.myId) {
          if (this.myPlayer) {
            this.myPlayer.x = users[id].x
            this.myPlayer.y = users[id].y
          }
          return
        }

        const displayName = users[id].name || id.slice(0, 6)

        if (!this.players[id]) {
          // First time we see this player — create avatar
          const avatar = this.createAvatar(0xff6b6b, displayName)
          this.layerChars.addChild(avatar)
          this.players[id] = avatar
        } else {
          // Player already exists — update name label if it changed
          const avatar = this.players[id]
          if (avatar._label !== displayName) {
            avatar._label = displayName
            avatar._bodyParts.nameText.text = displayName

            // Resize the tag background to fit the new name
            const bgW = avatar._bodyParts.nameText.width + 10
            avatar._bodyParts.tagBg.clear()
            avatar._bodyParts.tagBg
              .roundRect(-bgW / 2, 32, bgW, 13, 3)
              .fill({ color: 0x000000, alpha: 0.6 })
          }
        }

        this.players[id].x = users[id].x
        this.players[id].y = users[id].y
      })

      // Remove disconnected players
      Object.keys(this.players).forEach((id) => {
        if (!users[id]) {
          this.layerChars.removeChild(this.players[id])
          delete this.players[id]
        }
      })

      this.checkProximity(users)
    })
  }
  checkProximity(users) {
    if (!this.myId) return

    let nearestId = null
    let minDist = Infinity

    Object.keys(users).forEach((id) => {
      if (id === this.myId) return
      const dx = this.myPlayer.x - users[id].x
      const dy = this.myPlayer.y - users[id].y
      const dist = Math.hypot(dx, dy)
      if (dist < PROXIMITY_RADIUS && dist < minDist) {
        minDist = dist
        nearestId = id
      }
    })

    if (this.currentNearest !== nearestId) {
      this.currentNearest = nearestId
      this.onProximityChange(nearestId)
    }
  }

  // ─── Game loop ─────────────────────────────────────────────────────────────

  gameLoop(dt) {
    // ── Input & movement ──
    let moved = false
    if (this.keys['ArrowUp']    || this.keys['w']) { this.myPlayer.y -= SPEED; moved = true }
    if (this.keys['ArrowDown']  || this.keys['s']) { this.myPlayer.y += SPEED; moved = true }
    if (this.keys['ArrowLeft']  || this.keys['a']) { this.myPlayer.x -= SPEED; moved = true }
    if (this.keys['ArrowRight'] || this.keys['d']) { this.myPlayer.x += SPEED; moved = true }

    // Clamp to world bounds
    this.myPlayer.x = Math.max(50, Math.min(WORLD_W - 50, this.myPlayer.x))
    this.myPlayer.y = Math.max(100, Math.min(WORLD_H - 50, this.myPlayer.y))

    if (moved) {
      socket.emit('position-update', { x: this.myPlayer.x, y: this.myPlayer.y })
    }

    // ── Animate my player ──
    this._animateAvatar(this.myPlayer, dt, moved)

    // ── Animate other players ──
    Object.values(this.players).forEach(av => {
      this._animateAvatar(av, dt, false)
    })

    // ── Camera smooth follow ──
    const W = this.app.screen.width
    const H = this.app.screen.height
   const targetX = this.myPlayer.x
const targetY = this.myPlayer.y

this.cam.x += (targetX - this.cam.x) * 0.08
this.cam.y += (targetY - this.cam.y) * 0.08
    this.cam.x += (targetX - this.cam.x) * 0.08
    this.cam.y += (targetY - this.cam.y) * 0.08
    // this.cam.x = Math.max(0, Math.min(WORLD_W - W, this.cam.x))
    // this.cam.y = Math.max(0, Math.min(WORLD_H - H, this.cam.y))
    this.world.scale.set(this.zoom)

this.world.x = -this.cam.x * this.zoom + this.app.screen.width / 2
this.world.y = -this.cam.y * this.zoom + this.app.screen.height / 2

    // ── Y-sort characters ──
    const chars = this.layerChars.children.slice()
    chars.sort((a, b) => a.y - b.y)
    chars.forEach((c, i) => { this.layerChars.setChildIndex(c, i) })
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    socket.off('connect')
    socket.off('players-update')
    this.app?.destroy(true, { children: true })
  }
}
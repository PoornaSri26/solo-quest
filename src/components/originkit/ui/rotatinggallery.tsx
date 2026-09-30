// Rotating Gallery — Originkit

"use client"

import { useEffect, useMemo, useRef } from "react"
import type { CSSProperties } from "react"

type ImageInput = string | { src?: string; srcSet?: string; alt?: string } | null | undefined

export interface RotatingGalleryItem {
    image?: ImageInput

    offsetY?: number
}

export interface RotatingGalleryRotation {
    spin?: number

    twist?: number

    axis?: "y" | "x"
}

export interface RotatingGalleryProps {
    images?: (RotatingGalleryItem | ImageInput)[]
    background?: string
    spacing?: number
    cardWidth?: number
    cardHeight?: number
    radius?: number
    rotation?: RotatingGalleryRotation
    tap?: boolean
    scrollLock?: boolean
    hold?: number
    scrollSensitivity?: number
    smoothing?: number
    drag?: boolean
    dragSensitivity?: number
    style?: CSSProperties
}

const DEFAULT_ROTATION: Required<RotatingGalleryRotation> = {
    spin: 5,
    twist: 3,
    axis: "y",
}

const DEFAULT_IMAGES: RotatingGalleryItem[] = [
  {"image":{"src":"https://images.unsplash.com/photo-1511512578047-dfb367046420?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fGdhbWluZ3xlbnwwfDB8MHx8fDI%3D","alt":"Quest System"},"offsetY":0},
  {"image":{"src":"https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cHJvZHVjdGl2aXR5fGVufDB8fDB8fHw%3D","alt":"Daily Dungeons"},"offsetY":0},
  {"image":{"src":"https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8dGVjaG5vbG9neXxlbnwwfDB8fHx8fDI%3D","alt":"Real-Time Progress"},"offsetY":0},
  {"image":{"src":"https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fHNob3B8ZW58MHwwfDB8fHx8fDI%3D","alt":"Shop System"},"offsetY":0},
  {"image":{"src":"https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fGxlYWRlcmJvYXJkfGVufDB8fDB8fHx8fDI%3D","alt":"Leaderboards"},"offsetY":0},
  {"image":{"src":"https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8YW5hbHl0aWNzfGVufDB8fDB8fHx8fDI%3D","alt":"Advanced Stats"},"offsetY":0}
]

const DEFAULT_BACKGROUND = "#000000"
const DEFAULT_SPACING = 16
const DEFAULT_CARD_WIDTH = 400
const DEFAULT_CARD_HEIGHT = 300
const DEFAULT_RADIUS = 16
const DEFAULT_TAP = true
const DEFAULT_SCROLL_LOCK = true
const DEFAULT_HOLD = 10
const DEFAULT_SCROLL_SENSITIVITY = 10
const DEFAULT_SMOOTHING = 0
const DEFAULT_DRAG = true
const DEFAULT_DRAG_SENSITIVITY = 10

const CAMERA_FOV = 45
const CAMERA_Z = 20

const VIEWPORT_HEIGHT =
    2 * Math.tan((CAMERA_FOV * Math.PI) / 180 / 2) * CAMERA_Z

const WIDTH_SEGMENTS = 100

const MAX_DPR = 2

const PLACEHOLDER_COUNT = 8

const GESTURE_GAIN = 1

const WHEEL_CLAMP = 240

const WHEEL_RUN_GAP = 400

const FOCUS_SECONDS = 0.6

const FOCUS_FILL = 0.82

const FOCUS_MAX_SCALE = 4

const FOCUS_DIM = 0.28

const TAP_SLOP_PX = 6
const TAP_MS = 500

const EDGE_AA_PX = 1.5

const WRAP_SLACK_CARDS = 3

const MAX_PLANES = 120

function wrapTo(value: number, span: number): number {
    return value - span * Math.floor(value / span + 0.5)
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function easeInOut(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function easeFor(smoothing: number): number {
    return 0.25 * Math.pow(0.016, clamp(smoothing, 0, 10) / 10)
}

function holdFor(hold: number): number {
    const held = clamp(hold, 0, 10)
    return held >= 10 ? Infinity : held * VIEWPORT_HEIGHT
}

function srcOf(value: ImageInput): string | null {
    if (!value) return null
    if (typeof value === "string") return value.trim() || null
    if (value.src) return value.src

    const first = value.srcSet?.split(",")[0]?.trim().split(/\s+/)[0]
    return first || null
}

function resolveEntry(entry: RotatingGalleryItem | ImageInput): {
    src: string | null
    offsetY: number
} {
    if (entry && typeof entry === "object" && "image" in entry) {
        return {
            src: srcOf(entry.image),
            offsetY: typeof entry.offsetY === "number" ? entry.offsetY : 0,
        }
    }
    return { src: srcOf(entry as ImageInput), offsetY: 0 }
}

function makePlaceholder(index: number): HTMLCanvasElement | null {
    if (typeof document === "undefined") return null
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 640
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    const hue = (index * 47 + 200) % 360
    const gradient = ctx.createLinearGradient(0, 0, 512, 640)
    gradient.addColorStop(0, `hsl(${hue} 42% 44%)`)
    gradient.addColorStop(1, `hsl(${(hue + 50) % 360} 58% 9%)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 640)
    return canvas
}

const VERTEX_SHADER = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform float uPosition;
uniform float uSpin;
uniform float uFlat;
uniform float uDistortion;
uniform vec3 distortionAxis;
uniform vec3 rotationAxis;

varying vec2 vUv;

float PI = 3.141592653589793238;

mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return mat4(oc * axis.x * axis.x + c,          oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0,
                oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c,          oc * axis.y * axis.z - axis.x * s, 0.0,
                oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c,          0.0,
                0.0,                               0.0,                               0.0,                              1.0);
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
    mat4 m = rotationMatrix(axis, angle);
    return (m * vec4(v, 1.0)).xyz;
}

float qinticInOut(float t) {
    return t < 0.5
        ? +16.0 * pow(t, 5.0)
        : -0.5 * abs(pow(2.0 * t - 2.0, 5.0)) + 1.0;
}

void main() {
    vUv = uv;

    float norm = 0.5;

    vec3 newpos = position;

    float offset = (dot(distortionAxis, position) + norm / 2.0) / norm;

    float localprogress = clamp(
        (fract(uPosition * uSpin * 0.01) - 0.01 * uDistortion * offset) /
            (1.0 - 0.01 * uDistortion),
        0.0,
        2.0
    );

    localprogress = qinticInOut(localprogress) * PI * (1.0 - uFlat);

    newpos = rotate(newpos, rotationAxis, localprogress);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newpos, 1.0);
}
`

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 uImageSize;
uniform vec2 uPlaneSize;
uniform sampler2D tMap;
uniform float uOffset;
uniform float uRadius;
uniform float uAA;
uniform float uDim;

varying vec2 vUv;

void main() {
    vec2 ratio = vec2(
        min((uPlaneSize.x / uPlaneSize.y) / (uImageSize.x / uImageSize.y), 1.0),
        min((uPlaneSize.y / uPlaneSize.x) / (uImageSize.y / uImageSize.x), 1.0)
    );

    float slack = (1.0 - ratio.y) * 0.5;
    float shift = clamp(uOffset * ratio.y, -slack, slack);

    vec2 uv = vec2(
        vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
        vUv.y * ratio.y + (1.0 - ratio.y) * 0.5 + shift
    );

    vec3 rgb = texture2D(tMap, uv).rgb * uDim;

    vec2 halfSize = uPlaneSize * 0.5;
    vec2 q = abs((vUv - 0.5) * uPlaneSize) - halfSize + uRadius;
    float dist = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - uRadius;
    float alpha = 1.0 - smoothstep(-uAA, uAA, dist);

    gl_FragColor = vec4(rgb * alpha, alpha);
}
`

function compile(
    gl: WebGLRenderingContext,
    type: number,
    source: string
): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(
            "RotatingGallery: shader failed —",
            gl.getShaderInfoLog(shader)
        )
        gl.deleteShader(shader)
        return null
    }
    return shader
}

function link(gl: WebGLRenderingContext): WebGLProgram | null {
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vs || !fs) return null
    const program = gl.createProgram()
    if (!program) return null
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn(
            "RotatingGallery: program failed —",
            gl.getProgramInfoLog(program)
        )
        gl.deleteProgram(program)
        return null
    }
    return program
}

function buildPlane(segments: number): {
    position: Float32Array
    uv: Float32Array
    index: Uint16Array
} {
    const cols = segments + 1
    const position = new Float32Array(cols * 2 * 3)
    const uv = new Float32Array(cols * 2 * 2)
    const index = new Uint16Array(segments * 6)

    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < cols; col++) {
            const i = row * cols + col
            const u = col / segments
            const v = 1 - row
            position[i * 3] = u - 0.5
            position[i * 3 + 1] = v - 0.5
            position[i * 3 + 2] = 0
            uv[i * 2] = u
            uv[i * 2 + 1] = v
        }
    }
    for (let col = 0; col < segments; col++) {
        const a = col
        const b = col + 1
        const c = cols + col
        const d = cols + col + 1
        index.set([a, c, b, b, c, d], col * 6)
    }
    return { position, uv, index }
}

function perspective(
    out: Float32Array,
    fovDeg: number,
    aspect: number,
    near: number,
    far: number
): void {
    const f = 1 / Math.tan((fovDeg * Math.PI) / 180 / 2)
    out.fill(0)
    out[0] = f / aspect
    out[5] = f
    out[10] = (far + near) / (near - far)
    out[11] = -1
    out[14] = (2 * far * near) / (near - far)
}

export default function RotatingGallery({
    images = DEFAULT_IMAGES,
    background = DEFAULT_BACKGROUND,
    spacing = DEFAULT_SPACING,
    cardWidth = DEFAULT_CARD_WIDTH,
    cardHeight = DEFAULT_CARD_HEIGHT,
    radius = DEFAULT_RADIUS,
    rotation,
    tap = DEFAULT_TAP,
    scrollLock = DEFAULT_SCROLL_LOCK,
    hold = DEFAULT_HOLD,
    scrollSensitivity = DEFAULT_SCROLL_SENSITIVITY,
    smoothing = DEFAULT_SMOOTHING,
    drag = DEFAULT_DRAG,
    dragSensitivity = DEFAULT_DRAG_SENSITIVITY,
    style,
}: RotatingGalleryProps) {
    const turn = { ...DEFAULT_ROTATION, ...rotation }

    const rootRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    const entries = useMemo(() => (images ?? []).map(resolveEntry), [images])
    const count = entries.length || PLACEHOLDER_COUNT

    const srcKey = entries.map((entry) => entry.src ?? "").join("\n")

    const live = useRef({
        entries,
        count,
        spacing,
        cardWidth,
        cardHeight,
        radius,
        turn,
        tap,
        scrollLock,
        hold,
        scrollSensitivity,
        smoothing,
        drag,
        dragSensitivity,
    })
    live.current = {
        entries,
        count,
        spacing,
        cardWidth,
        cardHeight,
        radius,
        turn,
        tap,
        scrollLock,
        hold,
        scrollSensitivity,
        smoothing,
        drag,
        dragSensitivity,
    }

    const decoded = useRef<{
        list: (HTMLImageElement | null)[]
        dirty: boolean
    }>({ list: [], dirty: true })

    useEffect(() => {
        let alive = true
        const srcs = srcKey ? srcKey.split("\n") : []
        decoded.current.list = srcs.map(() => null)
        decoded.current.dirty = true

        srcs.forEach((src, slot) => {
            if (!src) return
            const img = new Image()

            img.crossOrigin = "anonymous"
            let anonymous = true
            img.onload = () => {
                if (!alive) return
                decoded.current.list[slot] = img

                decoded.current.dirty = true
            }
            img.onerror = () => {
                if (!alive) return
                if (anonymous) {
                    anonymous = false
                    img.removeAttribute("crossorigin")
                    img.src = src
                    return
                }
                console.warn("RotatingGallery: image failed to load — " + src)
                decoded.current.list[slot] = null
                decoded.current.dirty = true
            }
            img.src = src
        })

        return () => {
            alive = false
        }
    }, [srcKey])

    useEffect(() => {
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return

        const options: WebGLContextAttributes = {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
        }
        const gl = (canvas.getContext("webgl", options) ||
            canvas.getContext(
                "experimental-webgl",
                options
            )) as WebGLRenderingContext | null
        if (!gl) {
            console.warn("RotatingGallery: WebGL is unavailable.")
            return
        }

        const program = link(gl)
        if (!program) return
        gl.useProgram(program)

        const plane = buildPlane(WIDTH_SEGMENTS)

        const positionBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, plane.position, gl.STATIC_DRAW)
        const aPosition = gl.getAttribLocation(program, "position")
        gl.enableVertexAttribArray(aPosition)
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0)

        const uvBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, plane.uv, gl.STATIC_DRAW)
        const aUv = gl.getAttribLocation(program, "uv")
        gl.enableVertexAttribArray(aUv)
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0)

        const indexBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, plane.index, gl.STATIC_DRAW)

        const uniform = (name: string) => gl.getUniformLocation(program, name)
        const uProjection = uniform("projectionMatrix")
        const uModelView = uniform("modelViewMatrix")
        const uPosition = uniform("uPosition")
        const uSpin = uniform("uSpin")
        const uDistortion = uniform("uDistortion")
        const uDistortionAxis = uniform("distortionAxis")
        const uRotationAxis = uniform("rotationAxis")
        const uPlaneSize = uniform("uPlaneSize")
        const uImageSize = uniform("uImageSize")
        const uOffset = uniform("uOffset")
        const uRadius = uniform("uRadius")
        const uAA = uniform("uAA")
        const uFlat = uniform("uFlat")
        const uDim = uniform("uDim")
        gl.uniform1i(uniform("tMap"), 0)

        gl.disable(gl.DEPTH_TEST)
        gl.disable(gl.CULL_FACE)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        gl.clearColor(0, 0, 0, 0)

        const placeholders = new Map<number, HTMLCanvasElement | null>()
        const placeholderFor = (index: number) => {
            if (!placeholders.has(index)) {
                placeholders.set(index, makePlaceholder(index))
            }
            return placeholders.get(index) ?? null
        }

        type Slot = { tex: WebGLTexture | null; width: number; height: number }
        const slots: Slot[] = []

        const growTo = (n: number) => {
            while (slots.length < n) {
                const tex = gl.createTexture()
                gl.bindTexture(gl.TEXTURE_2D, tex)
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_WRAP_S,
                    gl.CLAMP_TO_EDGE
                )
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_WRAP_T,
                    gl.CLAMP_TO_EDGE
                )

                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
                slots.push({ tex, width: 0, height: 0 })
            }
            while (slots.length > n) {
                const slot = slots.pop()
                if (slot?.tex) gl.deleteTexture(slot.tex)
            }
        }

        const uploadAll = (n: number) => {
            growTo(n)
            const list = decoded.current.list

            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
            for (let i = 0; i < n; i++) {
                const slot = slots[i]
                const img = list[i] ?? null
                const source: TexImageSource | null = img ?? placeholderFor(i)
                gl.bindTexture(gl.TEXTURE_2D, slot.tex)
                if (!source) continue

                try {
                    gl.texImage2D(
                        gl.TEXTURE_2D,
                        0,
                        gl.RGBA,
                        gl.RGBA,
                        gl.UNSIGNED_BYTE,
                        source
                    )
                    slot.width =
                        img?.naturalWidth ?? (source as HTMLCanvasElement).width
                    slot.height =
                        img?.naturalHeight ?? (source as HTMLCanvasElement).height
                } catch (err) {
                    console.warn(
                        "RotatingGallery: a picture cannot be drawn — its host sends no CORS header. Upload it to Framer, or serve it from one that does.",
                        err
                    )
                    decoded.current.list[i] = null
                    slot.width = 0
                    slot.height = 0
                }
            }
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            decoded.current.dirty = false
        }

        let cssW = 1
        let cssH = 1

        let unitsPerPx = VIEWPORT_HEIGHT
        const projection = new Float32Array(16)
        const modelView = new Float32Array(16)

        const resize = () => {
            const w = canvas.clientWidth || 1
            const h = canvas.clientHeight || 1
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const bw = Math.max(1, Math.round(w * dpr))
            const bh = Math.max(1, Math.round(h * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
            cssW = w
            cssH = h
            unitsPerPx = VIEWPORT_HEIGHT / h
            gl.viewport(0, 0, bw, bh)
            perspective(projection, CAMERA_FOV, bw / bh, 0.1, 100)
            gl.uniformMatrix4fv(uProjection, false, projection)
        }
        resize()
        const observer =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => resize())
                : null
        observer?.observe(canvas)

        const scroll = { current: 0, target: 0, grabbed: 0 }

        const focus = { index: -1, phase: 0, target: 0 }

        const layout = { ys: [] as number[], sx: 0, sy: 0, count: 0 }

        const pick = (clientX: number, clientY: number): number => {
            const rect = root.getBoundingClientRect()
            if (!rect.width || !rect.height) return -1

            const worldX =
                ((clientX - rect.left) / rect.width - 0.5) * cssW * unitsPerPx
            const worldY =
                (0.5 - (clientY - rect.top) / rect.height) * cssH * unitsPerPx
            if (Math.abs(worldX) > layout.sx / 2) return -1
            let best = -1
            let bestDistance = Infinity
            for (let i = 0; i < layout.count; i++) {
                const distance = Math.abs(worldY - layout.ys[i])
                if (distance <= layout.sy / 2 && distance < bestDistance) {
                    best = i
                    bestDistance = distance
                }
            }
            return best
        }

        const applyCursor = () => {
            root.style.cursor =
                focus.index >= 0
                    ? "zoom-out"
                    : live.current.drag
                      ? "grab"
                      : "default"
        }

        const onTap = (clientX: number, clientY: number) => {
            if (!live.current.tap) return
            if (focus.index >= 0) {
                focus.target = 0
                applyCursor()
                return
            }
            const hit = pick(clientX, clientY)
            if (hit < 0) return
            focus.index = hit
            focus.target = 1

            scroll.target = scroll.current
            applyCursor()
        }

        let spent = 0
        let spentDir = 0

        let runLocked = false
        let lastWheelAt = -Infinity

        const onWheel = (event: WheelEvent) => {
            let delta = event.deltaY
            if (event.deltaMode === 1) delta *= 16
            else if (event.deltaMode === 2) delta *= root.clientHeight || 800
            delta = clamp(delta, -WHEEL_CLAMP, WHEEL_CLAMP)
            const travel =
                delta *
                unitsPerPx *
                GESTURE_GAIN *
                (live.current.scrollSensitivity / 5)

            if (focus.index >= 0) {
                if (live.current.scrollLock && event.cancelable) {
                    event.preventDefault()
                }
                return
            }

            const now = performance.now()
            const started = now - lastWheelAt > WHEEL_RUN_GAP
            lastWheelAt = now

            if (live.current.scrollLock && travel !== 0) {
                const direction = Math.sign(travel)
                const turned = direction !== spentDir
                if (turned) {
                    spentDir = direction
                    spent = 0
                }

                if (started || turned) runLocked = spent < holdFor(live.current.hold)
                if (runLocked) {
                    spent += Math.abs(delta) * unitsPerPx

                    if (event.cancelable) event.preventDefault()
                }
            } else if (!live.current.scrollLock) {
                runLocked = false
            }

            scroll.target += travel
        }

        let touchY: number | null = null
        const onTouchStart = (event: TouchEvent) => {
            touchY = event.touches[0]?.clientY ?? null
        }
        const onTouchMove = (event: TouchEvent) => {
            const y = event.touches[0]?.clientY
            if (y == null || touchY == null) return
            const delta = clamp(touchY - y, -WHEEL_CLAMP, WHEEL_CLAMP)
            touchY = y
            if (focus.index >= 0) return
            scroll.target +=
                delta *
                unitsPerPx *
                GESTURE_GAIN *
                (live.current.scrollSensitivity / 5)
        }
        const onTouchEnd = () => {
            touchY = null
        }

        let dragStart: number | null = null

        let pressed: { x: number; y: number; at: number } | null = null

        const onPointerDown = (event: PointerEvent) => {
            pressed = { x: event.clientX, y: event.clientY, at: performance.now() }

            if (
                !live.current.drag ||
                event.pointerType === "touch" ||
                focus.index >= 0
            ) {
                return
            }
            dragStart = event.clientY
            scroll.grabbed = scroll.target
            root.setPointerCapture?.(event.pointerId)
            root.style.cursor = "grabbing"
        }
        const onPointerMove = (event: PointerEvent) => {
            if (dragStart == null) return
            scroll.target =
                scroll.grabbed +
                (dragStart - event.clientY) *
                    unitsPerPx *
                    GESTURE_GAIN *
                    (live.current.dragSensitivity / 5)
        }
        const onPointerUp = (event: PointerEvent) => {
            if (dragStart != null) {
                dragStart = null
                root.releasePointerCapture?.(event.pointerId)
            }
            if (pressed) {
                const travelled = Math.hypot(
                    event.clientX - pressed.x,
                    event.clientY - pressed.y
                )
                const held = performance.now() - pressed.at
                pressed = null
                if (travelled <= TAP_SLOP_PX && held <= TAP_MS) {
                    onTap(event.clientX, event.clientY)
                    return
                }
            }
            applyCursor()
        }
        const onPointerCancel = () => {
            dragStart = null
            pressed = null
            applyCursor()
        }

        root.addEventListener("wheel", onWheel, { passive: false })
        root.addEventListener("touchstart", onTouchStart, { passive: true })
        root.addEventListener("touchmove", onTouchMove, { passive: true })
        root.addEventListener("touchend", onTouchEnd, { passive: true })
        root.addEventListener("touchcancel", onTouchEnd, { passive: true })
        root.addEventListener("pointerdown", onPointerDown)
        root.addEventListener("pointermove", onPointerMove)
        root.addEventListener("pointerup", onPointerUp)
        root.addEventListener("pointercancel", onPointerCancel)

        let visible = true
        const intersect =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(
                      (records) => {
                          const showing =
                              records[records.length - 1]?.isIntersecting ?? true

                          if (!showing) {
                              spent = 0
                              spentDir = 0
                              runLocked = false
                          }
                          visible = showing
                      },
                      { rootMargin: "200px" }
                  )
                : null
        intersect?.observe(root)

        let sources = -1

        let raf = 0
        let previous = performance.now()

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min((now - previous) / 1000, 0.1)
            previous = now
            if (!visible) return

            const props = live.current
            const pictures = Math.max(1, props.count)

            resize()

            if (sources !== pictures) {
                decoded.current.dirty = true
                sources = pictures
            }
            if (decoded.current.dirty) uploadAll(pictures)

            if (focus.phase !== focus.target) {
                const way = focus.target > focus.phase ? 1 : -1
                focus.phase = clamp(
                    focus.phase + (way * dt) / FOCUS_SECONDS,
                    0,
                    1
                )
                if (focus.phase === 0) focus.index = -1
            }
            const lifted = easeInOut(focus.phase)

            if (focus.index < 0) {
                const ease = 1 - Math.pow(1 - easeFor(props.smoothing), dt * 60)
                scroll.current += (scroll.target - scroll.current) * ease
            }

            const viewportH = VIEWPORT_HEIGHT

            const sx = Math.max(0.001, props.cardWidth * unitsPerPx)
            const sy = Math.max(0.001, props.cardHeight * unitsPerPx)
            const step = sy + Math.max(0, props.spacing) * unitsPerPx

            const spanNeeded = viewportH + WRAP_SLACK_CARDS * sy
            const repeats = Math.max(
                1,
                Math.min(
                    Math.max(1, Math.floor(MAX_PLANES / pictures)),
                    Math.ceil(spanNeeded / (step * pictures))
                )
            )
            const n = pictures * repeats
            const total = step * n

            if (focus.index >= n) {
                focus.index = -1
                focus.phase = 0
                focus.target = 0
            }

            const viewportW = viewportH * (cssW / Math.max(1, cssH))
            const focusScale = clamp(
                Math.min((FOCUS_FILL * viewportH) / sy, (FOCUS_FILL * viewportW) / sx),
                1,
                FOCUS_MAX_SCALE
            )
            const focusDepth = CAMERA_Z * (1 - 1 / focusScale)

            if (layout.ys.length !== n) layout.ys.length = n
            for (let i = 0; i < n; i++) {
                layout.ys[i] = wrapTo(step * i - scroll.current, total)
            }
            layout.sx = sx
            layout.sy = sy
            layout.count = n

            gl.uniform1f(uSpin, clamp(props.turn.spin, 0, 10))
            gl.uniform1f(uDistortion, clamp(props.turn.twist, 0, 10))

            gl.uniform3f(uDistortionAxis, 1, 1, 0)
            if (props.turn.axis === "x") gl.uniform3f(uRotationAxis, 1, 0, 0)
            else gl.uniform3f(uRotationAxis, 0, 1, 0)
            gl.uniform2f(uPlaneSize, sx, sy)
            gl.uniform1f(
                uRadius,
                clamp(props.radius * unitsPerPx, 0, Math.min(sx, sy) / 2)
            )
            gl.uniform1f(uAA, EDGE_AA_PX * unitsPerPx)

            gl.clear(gl.COLOR_BUFFER_BIT)

            const drawPlane = (i: number) => {
                const chosen = i === focus.index

                const home = layout.ys[i]

                const y = chosen ? home * (1 - lifted) : home

                gl.uniform1f(uPosition, 10 + (5 * (chosen ? home : y)) / viewportH)
                gl.uniform1f(uFlat, chosen ? lifted : 0)
                gl.uniform1f(uDim, chosen ? 1 : 1 - (1 - FOCUS_DIM) * lifted)

                modelView.fill(0)
                modelView[0] = sx
                modelView[5] = sy
                modelView[10] = 1
                modelView[13] = y
                modelView[14] = -CAMERA_Z + (chosen ? focusDepth * lifted : 0)
                modelView[15] = 1
                gl.uniformMatrix4fv(uModelView, false, modelView)

                const source = i % pictures
                const slot = slots[source]
                if (!slot) return
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, slot.tex)

                if (slot.width > 0 && slot.height > 0) {
                    gl.uniform2f(uImageSize, slot.width, slot.height)
                } else {
                    gl.uniform2f(uImageSize, sx, sy)
                }

                const offsetPx = props.entries[source]?.offsetY ?? 0
                gl.uniform1f(uOffset, offsetPx / Math.max(1, props.cardHeight))

                gl.drawElements(
                    gl.TRIANGLES,
                    plane.index.length,
                    gl.UNSIGNED_SHORT,
                    0
                )
            }

            for (let i = 0; i < n; i++) if (i !== focus.index) drawPlane(i)
            if (focus.index >= 0 && focus.index < n) drawPlane(focus.index)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            observer?.disconnect()
            intersect?.disconnect()
            root.removeEventListener("wheel", onWheel)
            root.removeEventListener("touchstart", onTouchStart)
            root.removeEventListener("touchmove", onTouchMove)
            root.removeEventListener("touchend", onTouchEnd)
            root.removeEventListener("touchcancel", onTouchEnd)
            root.removeEventListener("pointerdown", onPointerDown)
            root.removeEventListener("pointermove", onPointerMove)
            root.removeEventListener("pointerup", onPointerUp)
            root.removeEventListener("pointercancel", onPointerCancel)
            slots.forEach((slot) => slot.tex && gl.deleteTexture(slot.tex))
            gl.deleteBuffer(positionBuffer)
            gl.deleteBuffer(uvBuffer)
            gl.deleteBuffer(indexBuffer)
            gl.deleteProgram(program)

        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,

                touchAction: "pan-y",
                cursor: drag ? "grab" : "default",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}
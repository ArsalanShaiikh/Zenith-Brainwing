import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Observer } from 'gsap/Observer'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(
  useGSAP,
  Observer,
  Draggable,
  InertiaPlugin,
  SplitText,
  CustomEase,
)

export const ZENITH_EASE = CustomEase.create('zenith', '0.16, 1, 0.3, 1')

/** Single source of truth for the transition clock (ms). */
export const T = {
  total: 1150,
  outLines: 0,
  media: 180,
  indexRule: 260,
  inLines: 420,
  inFigures: 520,
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export { gsap, useGSAP, Observer, Draggable, InertiaPlugin, SplitText }

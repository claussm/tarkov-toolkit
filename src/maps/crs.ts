import L from 'leaflet'
import type { MapConfig } from './mapConfigs'

// Coordinate transform ported verbatim from tarkov.dev's MIT-licensed
// src/pages/map/index.jsx (getCRS / applyRotation / pos / getBounds / getScaledBounds).

export function applyRotation(latLng: L.LatLng, rotation: number): L.LatLng {
  if (!latLng.lng && !latLng.lat) return L.latLng(0, 0)
  if (!rotation) return latLng

  const angleInRadians = (rotation * Math.PI) / 180
  const cosAngle = Math.cos(angleInRadians)
  const sinAngle = Math.sin(angleInRadians)

  const x = latLng.lng
  const y = latLng.lat
  const rotatedX = x * cosAngle - y * sinAngle
  const rotatedY = x * sinAngle + y * cosAngle
  return L.latLng(rotatedY, rotatedX)
}

export function getCRS(config: MapConfig): L.CRS {
  let scaleX = 1
  let scaleY = 1
  let marginX = 0
  let marginY = 0
  if (config.transform) {
    scaleX = config.transform[0]
    scaleY = config.transform[2] * -1
    marginX = config.transform[1]
    marginY = config.transform[3]
  }
  return L.extend({}, L.CRS.Simple, {
    transformation: new L.Transformation(scaleX, marginX, scaleY, marginY),
    projection: L.extend({}, L.Projection.LonLat, {
      project: (latLng: L.LatLng) =>
        L.Projection.LonLat.project(applyRotation(latLng, config.coordinateRotation)),
      unproject: (point: L.Point) =>
        applyRotation(L.Projection.LonLat.unproject(point), config.coordinateRotation * -1),
    }),
  }) as unknown as L.CRS
}

// Game position {x, y, z} -> Leaflet latLng tuple. y is elevation (ignored in 2D).
export function pos(position: { x: number; z: number }): L.LatLngTuple {
  return [position.z, position.x]
}

export function getBounds(bounds: number[][]): L.LatLngBounds {
  const sw: L.LatLngTuple = [bounds[0][1], bounds[0][0]]
  const ne: L.LatLngTuple = [bounds[1][1], bounds[1][0]]
  return L.latLngBounds(sw, ne)
}

export function getScaledBounds(bounds: number[][], scaleFactor: number): L.LatLngBoundsLiteral {
  const centerX = (bounds[0][0] + bounds[1][0]) / 2
  const centerY = (bounds[0][1] + bounds[1][1]) / 2
  const width = bounds[1][0] - bounds[0][0]
  const height = bounds[1][1] - bounds[0][1]
  const newWidth = width * scaleFactor
  const newHeight = height * scaleFactor
  const sw: L.LatLngTuple = [centerY - newHeight / 2, centerX - newWidth / 2]
  const ne: L.LatLngTuple = [centerY + newHeight / 2, centerX + newWidth / 2]
  return [sw, ne]
}

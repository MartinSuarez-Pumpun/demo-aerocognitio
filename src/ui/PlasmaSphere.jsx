import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import './PlasmaSphere.css'

// Ported from .references/innovadef_plasma_sphere_final.html
// Added u_speak uniform: 0-1, drives extra displacement + brightness when speaking
export default function PlasmaSphere({ speakIntensity = 0 }) {
  const canvasRef = useRef(null)
  const speakRef = useRef(speakIntensity)

  useEffect(() => {
    speakRef.current = speakIntensity
  }, [speakIntensity])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100)
    camera.position.z = 3.2

    const vs = `
      uniform float u_time;
      uniform float u_speak;
      varying vec3  vNormal;
      varying float vDisp;
      varying float vSpeak;

      vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
      vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
      vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
      float snoise(vec3 v){
        const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
        vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
        vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
        vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
        vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
        i=mod289(i);
        vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
        float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
        vec4 j=p-49.*floor(p*ns.z*ns.z);
        vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
        vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;
        vec4 h=1.-abs(x)-abs(y);
        vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
        vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;
        vec4 sh=-step(h,vec4(0.));
        vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
        vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);
        vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
        vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
        p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
        vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
        m=m*m;
        return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
      }

      void main(){
        float t = u_time * 0.18;
        float n1 = snoise(position*1.8+vec3(t,t*0.6,t*0.4));
        float n2 = snoise(position*3.2+vec3(-t*0.5,t*0.8,-t*0.3));
        float n3 = snoise(position*5.5+vec3(t*0.3,-t*0.4,t*0.7));
        float baseDisp = n1*0.22+n2*0.10+n3*0.04;

        // Speaking: rhythmic surface pulse synced to voice frequency
        float speakPulse = u_speak * (0.06 + 0.14 * sin(u_time * 9.5 + position.y * 5.0 + position.x * 3.0));

        vDisp   = baseDisp + speakPulse;
        vSpeak  = u_speak;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * (baseDisp + speakPulse), 1.0);
      }
    `

    const fs = `
      uniform float u_speak;
      varying vec3  vNormal;
      varying float vDisp;
      varying float vSpeak;

      void main(){
        float fresnel = pow(1.0-abs(dot(vNormal,vec3(0.,0.,1.))),3.2);
        float glow    = clamp(vDisp*2.2+0.25, 0., 1.);

        vec3 cBase = vec3(0.08, 0.72, 0.22);
        vec3 cMid  = vec3(0.12, 0.86, 0.32);
        vec3 cEdge = vec3(0.06, 0.55, 0.18);

        vec3 col = mix(cEdge, cBase, glow);
        col = mix(col, cMid, clamp(vDisp*3.5,0.,1.)*0.55);
        col += fresnel * vec3(0.10, 0.68, 0.25) * 0.9;

        // Boost brightness + slight cyan tint when speaking
        col += vSpeak * vec3(0.04, 0.22, 0.10);

        float alpha = clamp(0.50+fresnel*0.38+glow*0.28, 0., 1.);
        gl_FragColor = vec4(col*(0.72+glow*0.55+vSpeak*0.18), alpha);
      }
    `

    const geo = new THREE.IcosahedronGeometry(1, 80)
    const mat = new THREE.ShaderMaterial({
      vertexShader: vs, fragmentShader: fs,
      uniforms: {
        u_time:  { value: 0 },
        u_speak: { value: 0 },
      },
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    })
    scene.add(new THREE.Mesh(geo, mat))

    const mkHalo = (r, falloff, a) => {
      const m = new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 vN;uniform float u_sp;void main(){float i=pow(${falloff.toFixed(1)}-dot(vN,vec3(0.,0.,1.)),3.8);gl_FragColor=vec4(0.08,0.78,0.22,i*(${a.toFixed(2)}+u_sp*0.35));}`,
        uniforms: { u_sp: { value: 0 } },
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
      })
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(r, 48, 48), m))
      return m
    }
    const h1 = mkHalo(1.16, 0.72, 0.55)
    const h2 = mkHalo(1.35, 0.62, 0.25)

    let t0 = Date.now()
    let rotX = 0, rotY = 0, rotVX = 0.0003, rotVY = 0.0006
    let smoothSpeak = 0
    let rafId

    function resize() {
      const parent = canvas.parentElement
      if (!parent) return
      const s = Math.min(parent.clientWidth, parent.clientHeight)
      canvas.style.width  = s + 'px'
      canvas.style.height = s + 'px'
      renderer.setSize(s, s, false)
      camera.aspect = 1
      camera.updateProjectionMatrix()
    }

    function animate() {
      rafId = requestAnimationFrame(animate)
      const elapsed = (Date.now() - t0) * 0.001

      // Smooth speak intensity via ref (avoids re-render dependency)
      smoothSpeak += (speakRef.current - smoothSpeak) * 0.07

      mat.uniforms.u_time.value  = elapsed
      mat.uniforms.u_speak.value = smoothSpeak
      h1.uniforms.u_sp.value     = smoothSpeak
      h2.uniforms.u_sp.value     = smoothSpeak

      // Faster, more energetic rotation when speaking
      const boost = 1 + smoothSpeak * 4
      rotVX += (Math.random() - 0.5) * 0.000012 * boost
      rotVY += (Math.random() - 0.5) * 0.000012 * boost
      rotVX *= 0.999
      rotVY *= 0.999

      rotX += rotVX * boost
      rotY += rotVY * boost

      scene.children.forEach(c => { c.rotation.x = rotX; c.rotation.y = rotY })
      renderer.render(scene, camera)
    }

    resize()
    animate()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      renderer.dispose()
      geo.dispose()
      mat.dispose()
    }
  }, [])

  return (
    <div className="plasma-sphere-wrap">
      <canvas ref={canvasRef} className="plasma-sphere-canvas" />
    </div>
  )
}

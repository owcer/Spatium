{//Spatium v0.1, by Ocelote licensable under MIT License
    let canvas = null
    let ctx = null
    let mouseLocker = e=>canvas.requestPointerLock()
    globalThis.Spatium={
        set canvas(newCanvas){
            if(canvas) canvas.removeEventListener('mousedown',mouseLocker)
            canvas = null
            if(newCanvas){
                canvas = newCanvas
                canvas.addEventListener('mousedown',mouseLocker)
                ctx = canvas.getContext("2d")
                physicsTick()
            }
        },
        get canvas(){
            return canvas
        },
        mesh:{
            create:{},
            transform:{},
        }
    }
    let addVec=(a1,a2)=>a1.map((v,i)=>v+a2[i])
    let rotx=([x,y,z],rad)=>{
        let cos = Math.cos(rad), sin = Math.sin(rad)
        return [x, y*cos - z*sin, y*sin + z*cos]
    }
    let roty=([x,y,z],rad)=>{
        let cos = Math.cos(rad), sin = Math.sin(rad)
        return [x*cos + z*sin, y, z*cos-x*sin]
    }
    let rotz=([x,y,z],rad)=>{
        let cos = Math.cos(rad), sin = Math.sin(rad)
        return [x*cos - y*sin, x*sin + y*cos, z]
    }
    let asCam=([x,y,z])=>rotx(roty([x-Spatium.camX,y-Spatium.camY,z-Spatium.camZ],Spatium.camRotYRad),Spatium.camRotXRad)
    let projectCam=(x,y,z,f=1)=>{
        [x,y,z]=asCam([x,y,z])
        return[f*x/z+canvas.width/2,f*-y/z+canvas.height/2]
    }
    let projectWorld=(x,y,z,f=1)=>{
        return[f*x/z+canvas.width/2,f*-y/z+canvas.height/2]
    }
    let drawPolygon2=(parr, opts)=>{
        if(parr.length<1)return
        let {fill="#0000",border="#000f",width=1}=opts||{}
        ctx.beginPath()
        ctx.moveTo(parr[0][0],parr[0][1])
        for (let i = 1; i < parr.length; i++) ctx.lineTo(parr[i][0],parr[i][1])
        ctx.closePath()
        ctx.fillStyle = fill
        ctx.fill()
        ctx.strokeStyle = border
        ctx.lineWidth = width
        ctx.stroke()
    }
    Spatium.mesh.transform.rotate=(faces,rotateX,rotateY,rotateZ,aroundX,aroundY,aroundZ)=>faces.map(({parr,opts})=>({parr:parr.map(([px,py,pz])=>addVec(roty(rotx(rotz([px-aroundX,py-aroundY,pz-aroundZ],rotateX),rotateY),rotateZ),[aroundX,aroundY,aroundZ])),opts}))
    Spatium.mesh.transform.translate=(faces,byX,byY,byZ)=>faces.map(({parr,opts})=>({parr:parr.map(([px,py,pz])=>[px+byX,py+byY,pz+byZ]),opts}))
    let parrAsCam=parr=>parr.map(asCam)
    let faceAsCam=({parr,opts})=>({parr:parrAsCam(parr),opts})
    let facesAsCam=faces=>faces.map(faceAsCam)
    let clipFace=(parr,clipDist=0.0625)=>{
        let clipped = []
        let len = parr.length
        for (let i = 0; i < len; i++) {
            let curr = parr[i]
            let next = parr[(i+1)%len]
            let currIn = curr[2]>clipDist
            let nextIn = next[2]>clipDist
            if(currIn&&nextIn)clipped.push(next)
            else if(!currIn && nextIn){
                let t = (clipDist-curr[2]) / (next[2]-curr[2])
                clipped.push([
                    curr[0] + t * (next[0]-curr[0]),
                    curr[1] + t * (next[1]-curr[1]),
                    clipDist,
                ])
                clipped.push(next)
            }else if(currIn && !nextIn){
                let t = (clipDist-curr[2]) / (next[2]-curr[2])
                clipped.push([
                    curr[0] + t * (next[0]-curr[0]),
                    curr[1] + t * (next[1]-curr[1]),
                    clipDist,
                ])
            }
            //else push nothing, because it can be skipped
        }
        return clipped
    }
    let drawPolygon3=(parr,opts)=>drawPolygon2(clipFace(parrAsCam(parr),Spatium.clipDist).map(([x,y,z])=>projectWorld(x,y,z,Spatium.focalDist)),opts)
    let drawFaces=(faces)=>{
        faces = faces.map(face=>({...face}))
        faces.forEach(face=>{
            let parr = face.parr
            let l = parr.length
            let cx = parr.reduce((s,p)=>s+p[0],0)/l
            let cy = parr.reduce((s,p)=>s+p[1],0)/l
            let cz = parr.reduce((s,p)=>s+p[2],0)/l
            face.d = Math.hypot(cx-Spatium.camX,cy-Spatium.camY,cz-Spatium.camZ)
        })
        faces.sort((a,b)=>b.d-a.d)
        faces.forEach(face=>drawPolygon3(face.parr,face.opts))
    }
    let drawObjects=objectArr=>{
        let faces = []
        objectArr.forEach(object=>{
            if(object.parr) faces.push(object)
            else faces.push(...object)
        })
        drawFaces(faces)
    }
    Spatium.mesh.create.cuboid=(pos1,pos2,opts)=>{
        let [x1,y1,z1]=pos1
        let [x2,y2,z2]=pos2
        ;[z1,z2]=[Math.max(z1,z2),Math.min(z1,z2)]
        let faces = [
            {parr:[
                [x1,y1,z1],
                [x1,y1,z2],
                [x1,y2,z2],
                [x1,y2,z1],
            ],opts},
            {parr:[
                [x2,y1,z1],
                [x2,y2,z1],
                [x2,y2,z2],
                [x2,y1,z2],
            ],opts},
            {parr:[
                [x1,y1,z1],
                [x2,y1,z1],
                [x2,y1,z2],
                [x1,y1,z2],
            ],opts},
            {parr:[
                [x1,y2,z1],
                [x2,y2,z1],
                [x2,y2,z2],
                [x1,y2,z2],
            ],opts},
            {parr:[
                [x1,y1,z1],
                [x2,y1,z1],
                [x2,y2,z1],
                [x1,y2,z1],
            ],opts},
            {parr:[
                [x1,y1,z2],
                [x2,y1,z2],
                [x2,y2,z2],
                [x1,y2,z2],
            ],opts},
        ]
        return faces
    }
    let draw=()=>{
        if(canvas===null)return
        ctx.fillStyle=Spatium.bgColor
        ctx.fillRect(0,0,canvas.width,canvas.height)
        drawObjects(Spatium.objects)
    }
    let keys = new Set()
    document.addEventListener('keydown',e=>keys.add(e.code.toLowerCase()))
    document.addEventListener('keyup',e=>keys.delete(e.code.toLowerCase()))
    document.addEventListener('mousemove',e=>{
        if(document.pointerLockElement!==canvas)return
        Spatium.movspX += e.movementX*Spatium.sensitivity*1e-4
        Spatium.movspY += e.movementY*Spatium.sensitivity*1e-4
    })
    let isPressed=key=>keys.has(key.toLowerCase())
    Spatium.speedX = 0
    Spatium.speedY = 0
    Spatium.speedZ = 0
    Spatium.movspX = 0
    Spatium.movspY = 0
    Spatium.camX = 0
    Spatium.camY = 0
    Spatium.camZ = 0
    Spatium.camRotYRad = 0
    Spatium.camRotXRad = 0
    let lastTick = Date.now()
    Spatium.speed = 0.02
    Spatium.friction = 0.2
    Spatium.sensitivity = 30
    Spatium.rotFriction = 0.4
    Spatium.clipDist = 0.0625
    Spatium.objects = []
    Spatium.bgColor = "white"
    Spatium.fovToFocalDist=fov=>canvas.width/(2*Math.tan((fov*Math.PI/180)/2))
    Spatium.focalDist=1000
    Spatium.tick=()=>{}
    Object.seal(Spatium)
    let physicsTick=()=>{
        draw()
        Spatium.tick?.()
        let currTick = Date.now()
        let dt = currTick-lastTick
        lastTick = currTick
        let right = Spatium.speed*dt*(isPressed('KeyD')-isPressed('KeyA'))
        let up = Spatium.speed*dt*(isPressed('Space')-(isPressed('ShiftLeft')||isPressed('ControlLeft')||isPressed('KeyC')||isPressed('KeyZ')))
        let front = Spatium.speed*dt*(isPressed('KeyW')-isPressed('KeyS'))
        Spatium.speedX+=right*Math.cos(Spatium.camRotYRad)-front*Math.sin(Spatium.camRotYRad)
        Spatium.speedY+=up
        Spatium.speedZ+=right*Math.sin(Spatium.camRotYRad)+front*Math.cos(Spatium.camRotYRad)
        Spatium.speedX*=1-Spatium.friction
        Spatium.speedY*=1-Spatium.friction
        Spatium.speedZ*=1-Spatium.friction
        Spatium.movspX*=1-Spatium.rotFriction
        Spatium.movspY*=1-Spatium.rotFriction
        Spatium.camRotXRad=Math.max(Math.min(Math.PI/2,(Spatium.camRotXRad-Spatium.movspY)),-Math.PI/2)
        Spatium.camRotYRad=(((Spatium.camRotYRad-Spatium.movspX)%(Math.PI*2))+Math.PI*2)%(Math.PI*2)
        Spatium.camX+=Spatium.speedX
        Spatium.camY+=Spatium.speedY
        Spatium.camZ+=Spatium.speedZ
        requestAnimationFrame(physicsTick)
    }
}

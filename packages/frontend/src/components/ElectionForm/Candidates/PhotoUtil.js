export const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.setAttribute('crossOrigin', 'anonymous')
        image.src = url
    })

export async function getImage(
    imageSrc,
    pixelCrop=undefined,
) {
    const image = await createImage(imageSrc)
    pixelCrop ??= {x: 0, y: 0, width: image.width, height: image.height}
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
        return null
    }
    let longerLength = 300;
    let w = pixelCrop.width > pixelCrop.height ? longerLength : longerLength * pixelCrop.width / pixelCrop.height;
    let h = pixelCrop.height > pixelCrop.width ? longerLength : longerLength * pixelCrop.height / pixelCrop.width;
    canvas.width = w
    canvas.height = h
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, w, h)
    return new Promise((resolve) => {
        canvas.toBlob((file) => {
            resolve(file)
        }, 'image/jpeg')
    })
}

export const postImage = async (image) => {
    const url = '/API/images'
    const fileOfBlob = new File([image], 'image.jpg', { type: "image/jpeg" });
    const formData = new FormData()
    formData.append('file', fileOfBlob)
    const options = {
        method: 'post',
        body: formData
    }
    const response = await fetch(url, options)
    if (!response.ok) {
        return false
    }
    return await response.json()
}
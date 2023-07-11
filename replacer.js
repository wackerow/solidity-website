const replace = require('replace-in-file')
const options = {
  files: './out/*.html',
  from: [/src="\//g, /href="\//g],
  to: ['src="./', 'href="./'],
}
;(async function () {
  try {
    const results = await replace(options)
    console.log('Replacement results:', results)
  } catch (error) {
    console.error('Error occurred:', error)
  }
})()

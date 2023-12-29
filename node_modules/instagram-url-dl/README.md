## Usage
```
const ig = require('instagram-url-dl')

const link = "https://www.instagram.com/p/Ctv11DiPfV5/?igshid=NTc4MTIwNjQ2YQ=="

ig(link)
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.error(err);
  });
data How to use this to App

This document outlines the steps to create `qrdata.yaml` for the Contact Carousel application and publish it to GitHub Pages.

## 1. Creating `qrdata.yaml`

The `qrdata.yaml` file contains the qrcode data that will be used by the application. It should be structured as a YAML array of objects, where each object represents a qrcode.

**Example `qrdata.yaml`:**

```yaml
- url: "https://johndoe.example.com"
  description: |
    John Doe is a software engineer.
    He works on web development and loves React.
- url: "https://janesmith.example.com"
  description: |
    Jane Smith is a data scientist.
    She specializes in machine learning and data visualization.
- url: "https://peterjones.example.com"
  description: |
    Peter Jones is a graphic designer.
    He creates beautiful user interfaces.
```

**Structure:**

* `-`: Indicates an array item.
* `url`: The URL of the qrcode (string).
* `description`: A multi-line string containing the qrcode description (using `|`). You can use Markdown syntax within the description.

**Steps:**

1.  **Create the File:** Create a file named `qrdata.yaml` in the `data/` directory of your project's root.
2.  **Add QR Data:** Add the QR data in the YAML format shown above.
3.  **Save the File:** Save the `qrdata.yaml` file.

## 2. Running the Build Script

The `yaml-to-json.js` script converts the `qrdata.yaml` file into `qrdata.js`, which is used by the React application.

**Steps:**

1.  **Run the Script:** Execute the following command in your terminal:

    ```bash
    npm run yaml-to-json
    ```

    This will generate the `src/data/qrdata.js` file.

## 3. Publishing to GitHub Pages

To publish the application to GitHub Pages, follow these steps:

**Prerequisites:**

* You have a GitHub repository for your project.
* You have `gh-pages` installed as a dev dependency (`npm install gh-pages --save-dev`).

**Steps:**

1.  **Set `homepage` (Conditionally):**
    * The `yaml-to-json.js` script will automatically set the homepage within the package.json file when the `REACT_APP_GH_PAGES` environment variable is set.
    * This is done via the `build-gh-pages` script.

2.  **Run the Build Script for GitHub Pages:**

    ```bash
    npm run predeploy
    ```

    This will run the build script, and set the homepage in the package.json.

3.  **Deploy to GitHub Pages:**

    ```bash
    npm run deploy
    ```

    This will create a `gh-pages` branch in your repository and push the contents of the `build` directory to it.

4.  **Configure GitHub Pages:**
    * Go to your repository on GitHub.
    * Go to the "Settings" tab.
    * Scroll down to the "Pages" section.
    * In the "Branch" dropdown, select the `gh-pages` branch.
    * Click "Save."

5.  **Access Your Site:**
    * Your site will be available at `https://${GITHUB_USERNAME}.github.io/${GITHUB_REPO_NAME}/`.

**Example:**

If your GitHub username is `myuser` and your repository name is `qrousel`, your site will be available at `https://myuser.github.io/qrousel/`.

**Important Notes:**

* Replace `${GITHUB_USERNAME}` and `${GITHUB_REPO_NAME}` with your actual GitHub username and repository name.
* The `gh-pages` deployment might take a few minutes to become available.
* If you make changes to `qrdata.yaml`, you must run `npm run yaml-to-json`, `npm run predeploy`, and `npm run deploy` again to update your GitHub Pages site.
* If you run into issues with the gh-pages branch, delete the remote gh-pages branch, and run `npm run deploy` again.

# Developer Documentation

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

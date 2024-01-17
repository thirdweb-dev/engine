#### Zeet Deployment Guide:

1. Goto https://zeet.co/ and create an account
2. Create a new project
3. Select `Docker Image` as the deployment method
4. Under `Docker Image`, search for `thirdweb/engine` and select it
5. Under `Docker Image Tag`, select either `latest` or `nightly`
   ![Alt text](../../images/Zeet-Docker-Source-Setting.png)
6. Select the Target cluster you want the above image to be deployed to
7. Choose your `Compute` settings
8. Update the `port` under `Networking` Tab to `3005`
9. Under `Environment Variables` add the below vars with values:

```
POSTGRES_CONNECTION_URL
THIRDWEB_API_SECRET_KEY
```

10. Under `Organize` Tab,

- you can select an existing `group`` or create a new one
- you can select an existing `sub-group` or create a new one
- Add a Project Name

11. Click on `Deploy` button
12. Once the deployment is complete, you can click on the URL given by zeet to check if Engine is running.

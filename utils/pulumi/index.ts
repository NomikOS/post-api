import * as pulumi from '@pulumi/pulumi'
import * as gcp from '@pulumi/gcp'
import * as docker from '@pulumi/docker'

const env = pulumi.getStack()
const env = pulumi.getStack()
const env = pulumi.getStack()
const $_ENV = pulumi.getStack()

const $_ENV = 'testing'



// let config = new pulumi.Config()
// let location = gcp.config.region
let location = 'us-east1'

const postApiImage = new docker.Image('post-api', {
  imageName: pulumi.interpolate`gcr.io/${gcp.config.project}/post-api:latest`,
  build: {
    context: '../../../post-api/'
  }
})

const postApiService = new gcp.cloudrun.Service(
  'postApi',
  {
    location,
    template: {
      spec: {
        containers: [
          {
            image: postApiImage.imageName,
            resources: {
              limits: {
                memory: '256Mb'
              }
            }
          }
        ],
        containerConcurrency: 80
      }
    }
  }
  //   { dependsOn: enableCloudRun }
)

const postApiIam = new gcp.cloudrun.IamMember('post-api-everyone', {
  service: postApiService.name,
  location,
  role: 'roles/run.invoker',
  member: 'allUsers'
})

// Export the URL
export const postApiUrl = postApiService.statuses[0].url

pulumi import gcp:firebase/project:Project default service-account.json
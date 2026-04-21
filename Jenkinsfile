def FAILED_STAGE = 'Initialization'

pipeline {
  agent any

  environment {
    PROJECT_NAME    = 'systemq'
    REGISTRY        = 'quantumteknologi'

    REGISTRY_CRED   = 'registry-docker'
    REGISTRY_URL    = 'https://index.docker.io/v1/'

    SLACK_BOT_WEBHOOK_URL = credentials('slack-webhookurl-internalops')

    KUBECONFIG_CRED = 'matrix-rancher'
  }

  triggers {
    githubPush()
  }

  options {
    skipDefaultCheckout(true)
    timestamps()
    disableConcurrentBuilds()
  }

  stages {

    /* =============================
     * Checkout
     * ============================= */
    stage('Checkout') {
      when {
        anyOf {
          branch 'main'
          branch 'staging'
        }
      }
      steps {
        script {
          FAILED_STAGE = 'Checkout'
          def scmVars = checkout scm
          env.GIT_COMMIT  = scmVars.GIT_COMMIT
          env.GIT_PREVIOUS_SUCCESSFUL_COMMIT = scmVars.GIT_PREVIOUS_SUCCESSFUL_COMMIT
          env.COMMIT_MSG    = sh(script: 'git log -1 --pretty=%B', returnStdout: true).trim()
          env.COMMIT_AUTHOR = sh(script: 'git log -1 --pretty=%an', returnStdout: true).trim()
        }
      }
    }

    /* =============================
     * Compute Image Tag & Detect Changes
     * ============================= */
    stage('Compute Tag & Detect Changes') {
      steps {
        script {
          FAILED_STAGE = 'Compute Tag & Detect Changes'
          env.IMAGE_VERSION = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
          echo "Image tag: ${env.IMAGE_VERSION}"

          env.APP_ENV = (env.BRANCH_NAME == 'main') ? 'prod' : 'staging'

          if (env.BRANCH_NAME == 'main') {
            env.DEPLOY_NS      = 'internal-ops'
            env.BE_IMAGE_NAME  = 'systemq-be'
            env.FE_IMAGE_NAME  = 'systemq-fe'
          } else {
            env.DEPLOY_NS      = 'systemq-stg'
            env.BE_IMAGE_NAME  = 'systemq-staging-be'
            env.FE_IMAGE_NAME  = 'systemq-staging-fe'
          }

          // Determine changed files
          def changedFiles = ""
          if (env.GIT_PREVIOUS_SUCCESSFUL_COMMIT) {
            changedFiles = sh(script: "git diff --name-only ${env.GIT_PREVIOUS_SUCCESSFUL_COMMIT} ${env.GIT_COMMIT} || echo ''", returnStdout: true).trim()
          } else {
            changedFiles = "fe/\nbe/"
          }

          def lines = changedFiles.split('\n')
          env.BUILD_FE = lines.any { it.startsWith('fe/') } ? 'true' : 'false'
          env.BUILD_BE = lines.any { it.startsWith('be/') } ? 'true' : 'false'

          if (lines.any { it == 'Jenkinsfile' || it.startsWith('docker-compose') }) {
            env.BUILD_FE = 'true'
            env.BUILD_BE = 'true'
          }

          if (env.BUILD_FE == 'false' && env.BUILD_BE == 'false') {
            env.BUILD_FE = 'true'
            env.BUILD_BE = 'true'
          }

          echo "BUILD_FE: ${env.BUILD_FE}, BUILD_BE: ${env.BUILD_BE}"
          sendSlack('STARTED', PROJECT_NAME, env.BRANCH_NAME, env.IMAGE_VERSION)
        }
      }
    }

    /* =============================
     * Docker Build BE
     * ============================= */
    stage('Docker Build BE') {
      when {
        expression { return env.BUILD_BE == 'true' }
      }
      steps {
        script {
          FAILED_STAGE = 'Docker Build BE'
          sh "docker build -t ${REGISTRY}/${env.BE_IMAGE_NAME}:${env.IMAGE_VERSION} -f be/Dockerfile be/"
        }
      }
    }

    /* =============================
     * Docker Build FE
     * ============================= */
    stage('Docker Build FE') {
      when {
        expression { return env.BUILD_FE == 'true' }
      }
      steps {
        script {
          FAILED_STAGE = 'Docker Build FE'
          def viteAppEnv = env.APP_ENV == 'prod' ? 'production' : 'staging'
          sh "docker build -t ${REGISTRY}/${env.FE_IMAGE_NAME}:${env.IMAGE_VERSION} --build-arg VITE_APP_ENV=${viteAppEnv} -f fe/Dockerfile fe/"
        }
      }
    }

    /* =============================
     * Docker Push BE
     * ============================= */
    stage('Docker Push BE') {
      when {
        expression { return env.BUILD_BE == 'true' }
      }
      steps {
        script { FAILED_STAGE = 'Docker Push BE' }
        withDockerRegistry(url: REGISTRY_URL, credentialsId: REGISTRY_CRED) {
          sh "docker push ${REGISTRY}/${env.BE_IMAGE_NAME}:${env.IMAGE_VERSION}"
        }
      }
    }

    /* =============================
     * Docker Push FE
     * ============================= */
    stage('Docker Push FE') {
      when {
        expression { return env.BUILD_FE == 'true' }
      }
      steps {
        script { FAILED_STAGE = 'Docker Push FE' }
        withDockerRegistry(url: REGISTRY_URL, credentialsId: REGISTRY_CRED) {
          sh "docker push ${REGISTRY}/${env.FE_IMAGE_NAME}:${env.IMAGE_VERSION}"
        }
      }
    }

    /* =============================
     * Deploy to Kubernetes BE
     * ============================= */
    stage('Deploy to Kubernetes BE') {
      when {
        expression { return env.BUILD_BE == 'true' }
      }
      steps {
        script { FAILED_STAGE = 'Deploy to Kubernetes BE' }
        withCredentials([file(credentialsId: KUBECONFIG_CRED, variable: 'KUBECONFIG')]) {
          sh """
            export KUBECONFIG=${KUBECONFIG}
            kubectl --insecure-skip-tls-verify=true set image deployment/${env.BE_IMAGE_NAME} \
              ${env.BE_IMAGE_NAME}=${REGISTRY}/${env.BE_IMAGE_NAME}:${env.IMAGE_VERSION} \
              -n ${DEPLOY_NS}
          """
        }
      }
    }

    /* =============================
     * Deploy to Kubernetes FE
     * ============================= */
    stage('Deploy to Kubernetes FE') {
      when {
        expression { return env.BUILD_FE == 'true' }
      }
      steps {
        script { FAILED_STAGE = 'Deploy to Kubernetes FE' }
        withCredentials([file(credentialsId: KUBECONFIG_CRED, variable: 'KUBECONFIG')]) {
          sh """
            export KUBECONFIG=${KUBECONFIG}
            kubectl --insecure-skip-tls-verify=true set image deployment/${env.FE_IMAGE_NAME} \
              ${env.FE_IMAGE_NAME}=${REGISTRY}/${env.FE_IMAGE_NAME}:${env.IMAGE_VERSION} \
              -n ${DEPLOY_NS}
          """
        }
      }
    }
  }

  post {
    success {
      node('') {
        sendSlack('SUCCESS', env.PROJECT_NAME, env.BRANCH_NAME ?: '', env.IMAGE_VERSION ?: '')
      }
    }
    failure {
      node('') {
        script {
          if (currentBuild.result != 'NOT_BUILT') {
            sendSlack('FAILURE', env.PROJECT_NAME, env.BRANCH_NAME ?: '', env.IMAGE_VERSION ?: 'N/A', FAILED_STAGE)
          }
        }
      }
    }
    always {
      node('') {
        sh '''
          echo "Cleaning up..."
          docker image prune -f || true
        '''
      }
    }
  }
}

/* =============================
 * Notification Helper
 * ============================= */
def sendSlack(String status, String project, String branch, String version, String failedStage = '') {
  def color = ''
  def title = ''
  def icon  = ''

  if (status == 'STARTED') {
    color = '#3498db'
    title = 'Pipeline Started'
    icon  = '🚀'
  } else if (status == 'SUCCESS') {
    color = '#2ecc71'
    title = 'Deploy Success'
    icon  = '✅'
  } else {
    color = '#e74c3c'
    title = 'Build Failed'
    icon  = '🚨'
  }

  def commitMsg = env.COMMIT_MSG    ?: 'N/A'
  def author    = env.COMMIT_AUTHOR ?: 'N/A'

  commitMsg = commitMsg.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '')
  author    = author.replace('\\', '\\\\').replace('"', '\\"')

  def building = []
  if (env.BUILD_FE == 'true') building.add('FE')
  if (env.BUILD_BE == 'true') building.add('BE')
  def buildingStr = building ? building.join(', ') : 'None'

  def payload = """
  {
    "attachments": [
      {
        "color": "${color}",
        "pretext": "*${icon} ${title}*",
        "fields": [
          { "title": "Project",      "value": "${project}",               "short": true },
          { "title": "Branch",       "value": "${branch}",                "short": true },
          { "title": "Building",     "value": "${buildingStr}",           "short": true },
          { "title": "Tag",          "value": "${version}",               "short": true },
          { "title": "Author",       "value": "${author}",                "short": true },
          { "title": "Failed Stage", "value": "${failedStage ?: 'None'}", "short": true },
          { "title": "Commit",       "value": "${commitMsg}",             "short": false }
        ],
        "footer": "Jenkins CI — infra-docs",
        "ts": ${System.currentTimeMillis() / 1000},
        "actions": [
          {
            "type": "button",
            "text": "View Logs",
            "url": "${env.BUILD_URL}",
            "style": "primary"
          }
        ]
      }
    ]
  }
  """

  writeFile file: 'slack-payload.json', text: payload

  sh """
    curl -s -X POST ${env.SLACK_BOT_WEBHOOK_URL} \\
      -H 'Content-Type: application/json' \\
      -d @slack-payload.json
  """
}
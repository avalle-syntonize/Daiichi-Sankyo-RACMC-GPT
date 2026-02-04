// @ts-nocheck
import { CommandBarButton, Dialog, DialogType, IconButton, Stack } from '@fluentui/react'
import { Dismiss16Regular, ErrorCircleRegular, ShieldLockRegular, SquareRegular } from '@fluentui/react-icons'
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { withAITracking } from '@microsoft/applicationinsights-react-js'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism'

import DOMPurify from 'dompurify'
import { isEmpty } from 'lodash'
import ReactMarkdown from 'react-markdown'
import uuid from 'react-uuid'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import supersub from 'remark-supersub'

import DaiichiSankyo from '../../assets/Daiichi-sankyo.svg'
import { XSSAllowTags } from '../../constants/xssAllowTags'
import styles from './Chat.module.css'

import { useBoolean } from '@fluentui/react-hooks'
import {
  ChatHistoryLoadingState,
  ChatMessage,
  ChatResponse,
  Citation,
  Conversation,
  ConversationRequest,
  CosmosDBStatus,
  ErrorMessage,
  ToolMessageContent,
  conversationApi,
  getUserInfo,
  historyClear,
  historyGenerate,
  historyUpdate,
  clearUploadedFile
} from '../../api'
import { Answer } from '../../components/Answer'
import { ChatHistoryPanel } from '../../components/ChatHistory/ChatHistoryPanel'
import { QuestionInput } from '../../components/QuestionInput'
import { AppStateContext } from '../../state/AppProvider'
import { appInsights, reactPlugin } from '../../AppInsights'

const enum messageStatus {
  NotRunning = 'Not Running',
  Processing = 'Processing',
  Done = 'Done'
}

const conversationNotFound = 'Conversation not found.'

const Chat = () => {
  const appStateContext = useContext(AppStateContext)
  const ui = appStateContext?.state.frontendSettings?.ui
  const AUTH_ENABLED = appStateContext?.state.frontendSettings?.auth_enabled
  const SANITIZE_ANSWER = appStateContext?.state.frontendSettings?.sanitize_answer
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false)
  const [activeCitation, setActiveCitation] = useState<Citation>()
  const [isCitationPanelOpen, setIsCitationPanelOpen] = useState<boolean>(false)
  const abortFuncs = useRef([] as AbortController[])
  const [showAuthMessage, setShowAuthMessage] = useState<boolean | undefined>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [processMessages, setProcessMessages] = useState<messageStatus>(messageStatus.NotRunning)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [clearingChat, setClearingChat] = useState<boolean>(false)
  const [hideErrorDialog, { toggle: toggleErrorDialog }] = useBoolean(true)
  const [showNewsHeader, setShowNewsHeader] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<ErrorMessage | null>()
  const [fileName, setFileName] = useState<string | null >()

  const errorDialogContentProps = {
    type: DialogType.close,
    title: errorMsg?.title,
    closeButtonAriaLabel: 'Close',
    subText: errorMsg?.subtitle
  }

  const modalProps = {
    titleAriaId: 'labelId',
    subtitleAriaId: 'subTextId',
    isBlocking: true,
    styles: { main: { maxWidth: 450 } }
  }

  const [ASSISTANT, TOOL, ERROR] = ['assistant', 'tool', 'error']
  const NO_CONTENT_ERROR = 'No content in messages object.'

  useEffect(() => {
    if (
      appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.Working &&
      appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured &&
      appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Fail &&
      hideErrorDialog
    ) {
      let subtitle = `${appStateContext.state.isCosmosDBAvailable.status}. Please contact the site administrator.`
      setErrorMsg({
        title: 'Chat history is not enabled',
        subtitle: subtitle
      })
      toggleErrorDialog()
    }
  }, [appStateContext?.state.isCosmosDBAvailable])

  const handleErrorDialogClose = () => {
    toggleErrorDialog()
    setTimeout(() => {
      setErrorMsg(null)
    }, 500)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    const documentTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const file = event.target.files ? event.target.files[0] : null

    if (file) {
      const fileType = file.type;

      if (imageTypes.includes(fileType)) {
        setSelectedImage(file);
        appInsights.trackEvent({ name: 'selectedImage' });
      } else if (documentTypes.includes(fileType)) {
        setSelectedFile(file);
        setFileName(file.name);
        if (appStateContext?.state?.currentChat?.id != null) {
          clearUploadedFile(appStateContext.state.currentChat.id);
        }
        appInsights.trackEvent({ name: 'selectedFile' });
      } else {
        console.log('Unsupported file type: '+ fileType);
      }
    } else {
      if (appStateContext?.state?.currentChat?.id != null) {
        clearUploadedFile(appStateContext.state.currentChat.id);
      }
    }

    event.target.value = '';
  };
  const toBase64 = (file: File) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

  useEffect(() => {
    setIsLoading(appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading)
  }, [appStateContext?.state.chatHistoryLoadingState])

  const getUserInfoList = async () => {
    setShowAuthMessage(false)
    return
    /*
    const userInfoList = await getUserInfo()
    if (userInfoList.length === 0 && window.location.hostname !== '127.0.0.1') {
      setShowAuthMessage(true)
    } else {
      setShowAuthMessage(false)
    }
    */
  }

  let assistantMessage = {} as ChatMessage
  let toolMessage = {} as ChatMessage
  let assistantContent = ''

  const processResultMessage = (resultMessage: ChatMessage, userMessage: ChatMessage, conversationId?: string) => {
    if (resultMessage.role === ASSISTANT) {
      assistantContent += resultMessage.content
      assistantMessage = resultMessage
      assistantMessage.content = assistantContent

      if (resultMessage.context) {
        toolMessage = {
          id: uuid(),
          role: TOOL,
          content: resultMessage.context,
          date: new Date().toISOString()
        }
      }
    }

    if (resultMessage.role === TOOL) toolMessage = resultMessage

    if (!conversationId) {
      isEmpty(toolMessage)
        ? setMessages([...messages, userMessage, assistantMessage])
        : setMessages([...messages, userMessage, toolMessage, assistantMessage])
    } else {
      isEmpty(toolMessage)
        ? setMessages([...messages, assistantMessage])
        : setMessages([...messages, toolMessage, assistantMessage])
    }
  }

  const reformulateAnswer = async (questionIndex: number, conversationId?: string) => {
    const conversation = appStateContext?.state?.currentChat
    if (!conversation) {
      console.error(conversationNotFound)
      return
    }

    while (conversation.messages.length > questionIndex + 1) {
      conversation.messages.pop()
    }

    const userMessage = conversation.messages.pop()

    if (!userMessage) {
      console.error('User message not found.')
      return
    }

    (appStateContext?.state.isCosmosDBAvailable?.cosmosDB && selectedImage == null
      ? makeApiRequestWithCosmosDB
      : makeApiRequestWithoutCosmosDB
    )("", conversationId, userMessage)
  }

  const makeApiRequestWithoutCosmosDB = async (question: string, conversationId?: string, message?: ChatMessage) => {
    appInsights.trackEvent({ name: 'sendChatMessage', properties: { withImage: selectedImage != null } })
    
    setIsLoading(true)
    setShowLoadingMessage(true)
    const abortController = new AbortController()
    abortFuncs.current.unshift(abortController)

    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }

    let userMessage: ChatMessage
    if (!message) {
      if (selectedImage) {

        const base64Image = await toBase64(selectedImage)

        userMessage = {
          id: uuid(),
          role: 'user',
          content: question,
          image_content: base64Image as string,
          date: new Date().toISOString()
        }
      } else if (selectedFile){
        const arrayBuffer = await selectedFile.arrayBuffer()
        const base64String = arrayBufferToBase64(arrayBuffer);

        userMessage = {
          id: uuid(),
          role: 'user',
          content: question + ' _(retrieved using ' + selectedFile.name + ')_',
          attachment_type: selectedFile["type"],
          file_content: base64String,
          date: new Date().toISOString()
        }
      } else {
        userMessage = {
          id: uuid(),
          role: 'user',
          content: question + ( fileName ? ' _(retrieved using ' +fileName + ')_': ""),
          date: new Date().toISOString()
        }
      }
    }
    else {
      userMessage = message
    }

    let conversation: Conversation | null | undefined
    if (!conversationId) {
      conversation = {
        id: conversationId ?? uuid(),
        title: question,
        messages: [userMessage],
        date: new Date().toISOString()
      }
    } else {
      conversation = appStateContext?.state?.currentChat
      if (!conversation) {
        console.error(conversationNotFound)
        setIsLoading(false)
        setShowLoadingMessage(false)
        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
        return
      } else {
        conversation.messages.push(userMessage)
      }
    }



    appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation })
    setMessages(conversation.messages)
    setSelectedImage(null);

    const request: ConversationRequest = {
      messages: [...conversation.messages.filter(answer => answer.role !== ERROR)]
    }

    let result = {} as ChatResponse
    try {
      const response = await conversationApi(request, abortController.signal)
      if (response?.body) {
        const reader = response.body.getReader()

        let runningText = ''
        while (true) {
          setProcessMessages(messageStatus.Processing)
          const { done, value } = await reader.read()
          if (done) break

          var text = new TextDecoder('utf-8').decode(value)
          const objects = text.split('\n')
          objects.forEach(obj => {
            try {
              if (obj !== '' && obj !== '{}') {
                runningText += obj
                result = JSON.parse(runningText)
                if (result.choices?.length > 0) {
                  result.choices[0].messages.forEach(msg => {
                    msg.id = result.id
                    msg.date = new Date().toISOString()
                  })
                  if (result.choices[0].messages?.some(m => m.role === ASSISTANT)) {
                    setShowLoadingMessage(false)
                  }
                  result.choices[0].messages.forEach(resultObj => {
                    processResultMessage(resultObj, userMessage, conversationId)
                  })
                } else if (result.error) {
                  throw Error(result.error)
                }
                runningText = ''
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) {
                console.error(e)
                throw e
              } else {
                console.log('Incomplete message. Continuing...')
              }
            }
          })
        }
        conversation.messages.push(toolMessage, assistantMessage)
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation })
        setMessages([...messages, toolMessage, assistantMessage])
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        let errorMessage =
          'An error occurred. Please try again. If the problem persists, please contact the site administrator.'
        if (result.error?.message) {
          errorMessage = result.error.message
        } else if (typeof result.error === 'string') {
          errorMessage = result.error
        }

        errorMessage = parseErrorMessage(errorMessage)

        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: errorMessage,
          date: new Date().toISOString()
        }
        conversation.messages.push(errorChatMsg)
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation })
        setMessages([...messages, errorChatMsg])
      } else {
        setMessages([...messages, userMessage])
      }
    } finally {
      setIsLoading(false)
      setShowLoadingMessage(false)
      abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
      setProcessMessages(messageStatus.Done)
    }
    abortController.abort()
  }

  const makeApiRequestWithCosmosDB = async (question: string, conversationId?: string, message?: ChatMessage) => {
    appInsights.trackEvent({ name: 'sendChatMessage', properties: { withImage: false } })
        
    setIsLoading(true)
    setShowLoadingMessage(true)
    const abortController = new AbortController()
    abortFuncs.current.unshift(abortController)

    let userMessage: ChatMessage
    // Commented out because the image upload feature is not supported with index
    /* if (selectedImage) {
      const base64Image = await toBase64(selectedImage)
   
      userMessage = {
        id: uuid(),
        role: 'user',
        content: question,
        image_content: base64Image as string,
        date: new Date().toISOString()
      }
    } else { */
    if (!message) {
      userMessage = {
        id: uuid(),
        role: 'user',
        content: question,
        date: new Date().toISOString()
      }
    }
    else {
      userMessage = message
    }
    /* } */

    //api call params set here (generate)
    let request: ConversationRequest
    let conversation
    if (conversationId) {
      conversation = appStateContext?.state?.chatHistory?.find(conv => conv.id === conversationId)
      if (!conversation) {
        console.error(conversationNotFound)
        setIsLoading(false)
        setShowLoadingMessage(false)
        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
        return
      } else {
        conversation.messages.push(userMessage)
        request = {
          messages: [...conversation.messages.filter(answer => answer.role !== ERROR)]
        }
      }
    } else {
      request = {
        messages: [userMessage].filter(answer => answer.role !== ERROR)
      }
      setMessages(request.messages)
    }
    let result = {} as ChatResponse
    var errorResponseMessage = 'Please try again. If the problem persists, please contact the site administrator.'
    try {
      const response = conversationId
        ? await historyGenerate(request, abortController.signal, conversationId)
        : await historyGenerate(request, abortController.signal)
      if (!response?.ok) {
        const responseJson = await response.json()
        errorResponseMessage =
          responseJson.error === undefined ? errorResponseMessage : parseErrorMessage(responseJson.error)
        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: `There was an error generating a response. Chat history can't be saved at this time. ${errorResponseMessage}`,
          date: new Date().toISOString()
        }
        let resultConversation
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(conv => conv.id === conversationId)
          if (!resultConversation) {
            console.error(conversationNotFound)
            setIsLoading(false)
            setShowLoadingMessage(false)
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
            return
          }
          resultConversation.messages.push(errorChatMsg)
        } else {
          setMessages([...messages, userMessage, errorChatMsg])
          setIsLoading(false)
          setShowLoadingMessage(false)
          abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
          return
        }
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation })
        setMessages([...resultConversation.messages])
        return
      }

      setSelectedImage(null);
      setSelectedFile(null);

      if (response?.body) {
        const reader = response.body.getReader()

        let runningText = ''
        while (true) {
          setProcessMessages(messageStatus.Processing)
          const { done, value } = await reader.read()
          if (done) break

          var text = new TextDecoder('utf-8').decode(value)
          const objects = text.split('\n')
          objects.forEach(obj => {
            try {
              if (obj !== '' && obj !== '{}') {
                runningText += obj
                result = JSON.parse(runningText)
                if (!result.choices?.[0]?.messages?.[0].content) {
                  errorResponseMessage = NO_CONTENT_ERROR
                  throw Error()
                }
                if (result.choices?.length > 0) {
                  result.choices[0].messages.forEach(msg => {
                    msg.id = result.id
                    msg.date = new Date().toISOString()
                  })
                  if (result.choices[0].messages?.some(m => m.role === ASSISTANT)) {
                    setShowLoadingMessage(false)
                  }
                  result.choices[0].messages.forEach(resultObj => {
                    processResultMessage(resultObj, userMessage, conversationId)
                  })
                }
                runningText = ''
              } else if (result.error) {
                throw Error(result.error)
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) {
                console.error(e)
                throw e
              } else {
                console.log('Incomplete message. Continuing...')
              }
            }
          })
        }

        let resultConversation
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(conv => conv.id === conversationId)
          if (!resultConversation) {
            console.error(conversationNotFound)
            setIsLoading(false)
            setShowLoadingMessage(false)
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
            return
          }
          isEmpty(toolMessage)
            ? resultConversation.messages.push(assistantMessage)
            : resultConversation.messages.push(toolMessage, assistantMessage)
        } else {
          resultConversation = {
            id: result.history_metadata.conversation_id,
            title: result.history_metadata.title,
            messages: [userMessage],
            date: result.history_metadata.date
          }
          isEmpty(toolMessage)
            ? resultConversation.messages.push(assistantMessage)
            : resultConversation.messages.push(toolMessage, assistantMessage)
        }
        if (!resultConversation) {
          setIsLoading(false)
          setShowLoadingMessage(false)
          abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
          return
        }
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation })
        isEmpty(toolMessage)
          ? setMessages([...messages, assistantMessage])
          : setMessages([...messages, toolMessage, assistantMessage])
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        let errorMessage = `An error occurred. ${errorResponseMessage}`
        if (result.error?.message) {
          errorMessage = result.error.message
        } else if (typeof result.error === 'string') {
          errorMessage = result.error
        }

        errorMessage = parseErrorMessage(errorMessage)

        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: errorMessage,
          date: new Date().toISOString()
        }
        let resultConversation
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(conv => conv.id === conversationId)
          if (!resultConversation) {
            console.error(conversationNotFound)
            setIsLoading(false)
            setShowLoadingMessage(false)
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
            return
          }
          resultConversation.messages.push(errorChatMsg)
        } else {
          if (!result.history_metadata) {
            console.error('Error retrieving data.', result)
            let errorChatMsg: ChatMessage = {
              id: uuid(),
              role: ERROR,
              content: errorMessage,
              date: new Date().toISOString()
            }
            setMessages([...messages, userMessage, errorChatMsg])
            setIsLoading(false)
            setShowLoadingMessage(false)
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
            return
          }
          resultConversation = {
            id: result.history_metadata.conversation_id,
            title: result.history_metadata.title,
            messages: [userMessage],
            date: result.history_metadata.date
          }
          resultConversation.messages.push(errorChatMsg)
        }
        if (!resultConversation) {
          setIsLoading(false)
          setShowLoadingMessage(false)
          abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
          return
        }
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation })
        setMessages([...messages, errorChatMsg])
      } else {
        setMessages([...messages, userMessage])
      }
    } finally {
      setIsLoading(false)
      setShowLoadingMessage(false)
      abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
      setProcessMessages(messageStatus.Done)
    }
    abortController.abort()
  }

  const clearChat = async () => {
    appInsights.trackEvent({ name: 'clearChat' })
    
    setClearingChat(true)
    if (appStateContext?.state.currentChat?.id && appStateContext?.state.isCosmosDBAvailable.cosmosDB) {
      let response = await historyClear(appStateContext?.state.currentChat.id)
      if (!response.ok) {
        setErrorMsg({
          title: 'Error clearing current chat',
          subtitle: 'Please try again. If the problem persists, please contact the site administrator.'
        })
        toggleErrorDialog()
      } else {
        appStateContext?.dispatch({
          type: 'DELETE_CURRENT_CHAT_MESSAGES',
          payload: appStateContext?.state.currentChat.id
        })
        appStateContext?.dispatch({ type: 'UPDATE_CHAT_HISTORY', payload: appStateContext?.state.currentChat })
        setActiveCitation(undefined)
        setIsCitationPanelOpen(false)
        setMessages([])
        setSelectedFile(null)
        setFileName(null)
      }
    }
    setClearingChat(false)
  }

  const tryGetRaiPrettyError = (errorMessage: string) => {
    try {
      // Using a regex to extract the JSON part that contains "innererror"
      const match = errorMessage.match(/'innererror': ({.*})\}\}/)
      if (match) {
        // Replacing single quotes with double quotes and converting Python-like booleans to JSON booleans
        const fixedJson = match[1]
          .replace(/'/g, '"')
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false')
        const innerErrorJson = JSON.parse(fixedJson)
        let reason = ''
        // Check if jailbreak content filter is the reason of the error
        const jailbreak = innerErrorJson.content_filter_result.jailbreak
        if (jailbreak.filtered === true) {
          reason = 'Jailbreak'
        }

        // Returning the prettified error message
        if (reason !== '') {
          return (
            'The prompt was filtered due to triggering Azure OpenAI’s content filtering system.\n' +
            'Reason: This prompt contains content flagged as ' +
            reason +
            '\n\n' +
            'Please modify your prompt and retry. Learn more: https://go.microsoft.com/fwlink/?linkid=2198766'
          )
        }
      }
    } catch (e) {
      console.error('Failed to parse the error:', e)
    }
    return errorMessage
  }

  const parseErrorMessage = (errorMessage: string) => {
    let errorCodeMessage = errorMessage.substring(0, errorMessage.indexOf('-') + 1)
    const innerErrorCue = "{\\'error\\': {\\'message\\': "
    if (errorMessage.includes(innerErrorCue)) {
      try {
        let innerErrorString = errorMessage.substring(errorMessage.indexOf(innerErrorCue))
        if (innerErrorString.endsWith("'}}")) {
          innerErrorString = innerErrorString.substring(0, innerErrorString.length - 3)
        }
        innerErrorString = innerErrorString.replaceAll("\\'", "'")
        let newErrorMessage = errorCodeMessage + ' ' + innerErrorString
        errorMessage = newErrorMessage
      } catch (e) {
        console.error('Error parsing inner error message: ', e)
      }
    }

    appInsights.trackException({ exception: new Error(errorMessage) })
    return tryGetRaiPrettyError(errorMessage)
  }

  const newChat = () => {
    window.location.reload()
    setProcessMessages(messageStatus.Processing)
    setMessages([])
    setIsCitationPanelOpen(false)
    setActiveCitation(undefined)
    appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: null })
    setProcessMessages(messageStatus.Done)
  }

  const stopGenerating = () => {
    appInsights.trackEvent({ name: 'stopGenerating' })

    abortFuncs.current.forEach(a => a.abort())
    setShowLoadingMessage(false)
    setIsLoading(false)
  }

  useEffect(() => {
    if (appStateContext?.state.currentChat) {
      setMessages(appStateContext.state.currentChat.messages)
    } else {
      setMessages([])
    }
  }, [appStateContext?.state.currentChat])

  useLayoutEffect(() => {
    const saveToDB = async (messages: ChatMessage[], id: string) => {
      const response = await historyUpdate(messages, id)
      return response
    }

    if (appStateContext && appStateContext.state.currentChat && processMessages === messageStatus.Done) {
      if (appStateContext.state.isCosmosDBAvailable.cosmosDB) {
        if (!appStateContext?.state.currentChat?.messages) {
          console.error('Failure fetching current chat state.')
          return
        }
        const noContentError = appStateContext.state.currentChat.messages.find(m => m.role === ERROR)

        if (!noContentError?.content.includes(NO_CONTENT_ERROR)) {
          saveToDB(appStateContext.state.currentChat.messages, appStateContext.state.currentChat.id)
            .then(res => {
              if (!res.ok) {
                let errorMessage =
                  "An error occurred. Answers can't be saved at this time. If the problem persists, please contact the site administrator."
                let errorChatMsg: ChatMessage = {
                  id: uuid(),
                  role: ERROR,
                  content: errorMessage,
                  date: new Date().toISOString()
                }
                if (!appStateContext?.state.currentChat?.messages) {
                  let err: Error = {
                    ...new Error(),
                    message: 'Failure fetching current chat state.'
                  }
                  throw err
                }
                setMessages([...appStateContext?.state.currentChat?.messages, errorChatMsg])
              }
              return res as Response
            })
            .catch(err => {
              console.error('Error: ', err)
              let errRes: Response = {
                ...new Response(),
                ok: false,
                status: 500
              }
              return errRes
            })
        }
      } else {
      }
      appStateContext?.dispatch({ type: 'UPDATE_CHAT_HISTORY', payload: appStateContext.state.currentChat })
      setMessages(appStateContext.state.currentChat.messages)
      setProcessMessages(messageStatus.NotRunning)
    }
  }, [processMessages])

  useEffect(() => {
    if (AUTH_ENABLED !== undefined) getUserInfoList()
  }, [AUTH_ENABLED])

  useLayoutEffect(() => {
    chatMessageStreamEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [showLoadingMessage, processMessages, messages])

  const onShowCitation = (citation: Citation) => {
    setActiveCitation(citation)
    setIsCitationPanelOpen(true)
  }

  const onViewSource = (citation: Citation) => {
    if (citation.url && !citation.url.includes('blob.core')) {
      window.open(citation.url, '_blank')
    }
  }

  const parseCitationFromMessage = (message: ChatMessage) => {
    if (message?.role && message?.role === 'tool') {
      try {
        const toolMessage = JSON.parse(message.content) as ToolMessageContent
        return toolMessage.citations
      } catch {
        return []
      }
    }
    return []
  }

  const components = {
    code({ node, ...props }: { node: any;[key: string]: any }) {
      let language
      if (props.className) {
        const match = props.className.match(/language-(\w+)/)
        language = match ? match[1] : undefined
      }
      const codeString = node.children[0].value ?? ''
      return (
        <SyntaxHighlighter style={nord} language={language} PreTag="div" {...props}>
          {codeString}
        </SyntaxHighlighter>
      )
    }
  }

  const disabledButton = () => {
    return (
      isLoading ||
      (messages && messages.length === 0) ||
      clearingChat ||
      appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading
    )
  }

  const NewsHeader = () => {
    return (
      <Stack horizontal className={styles.newsHeader}>
        <div>{appStateContext?.state.frontendSettings?.ui?.news_header}</div>
        <button
          className={styles.dismissButton}
          onClick={() => { setShowNewsHeader(false) }}>
          <Dismiss16Regular className={styles.closeNews} />
        </button>
      </Stack>
    )
  }

  return (

    <div className={styles.containerNoGap} role="main">
      {appStateContext?.state.frontendSettings?.ui?.news_header && showNewsHeader &&
        <NewsHeader />
      }
      {showAuthMessage ? (
        <Stack className={styles.chatEmptyState}>
          <ShieldLockRegular
            className={styles.chatIcon}
            style={{ color: 'darkorange', height: '200px', width: '200px' }}
          />
          <h1 className={styles.chatEmptyStateTitle}>Authentication Not Configured</h1>
          <h2 className={styles.chatEmptyStateSubtitle}>
            This app does not have authentication configured. Please add an identity provider by finding your app in the{' '}
            <a href="https://portal.azure.com/" target="_blank">
              Azure Portal
            </a>
            and following{' '}
            <a
              href="https://learn.microsoft.com/en-us/azure/app-service/scenario-secure-app-authentication-app-service#3-configure-authentication-and-authorization"
              target="_blank">
              these instructions
            </a>
            .
          </h2>
          <h2 className={styles.chatEmptyStateSubtitle} style={{ fontSize: '20px' }}>
            <strong>Authentication configuration takes a few minutes to apply. </strong>
          </h2>
          <h2 className={styles.chatEmptyStateSubtitle} style={{ fontSize: '20px' }}>
            <strong>If you deployed in the last 10 minutes, please wait and reload the page after 10 minutes.</strong>
          </h2>
        </Stack>
      ) : (
        <Stack horizontal className={styles.chatRoot}>
          <div className={styles.chatContainer}>
            {!messages || messages.length < 1 ? (
              <Stack className={styles.chatEmptyState}>
                <img src={ui?.chat_logo ? ui.chat_logo : DaiichiSankyo} className={styles.chatIcon} aria-hidden="true" />
                <h1 className={styles.chatEmptyStateTitle}>{ui?.chat_title}</h1>
                <h2 className={styles.chatEmptyStateSubtitle}>{ui?.chat_description}</h2>
              </Stack>
            ) : (
              <div className={styles.chatMessageStream} style={{ marginBottom: isLoading ? '40px' : '0px' }} role="log">
                {messages.map((answer, index) => (
                  <>
                    {answer.role === 'user' ? (
                      <div className={styles.chatMessageUser} tabIndex={0}>
                        <div className={styles.chatMessageUserMessage}>
                          {answer.image_content ? (
                            <>
                              <img className={styles.chatMessageImage} src={answer.image_content}></img>
                            </>
                          ) : null}
                          <ReactMarkdown
                            linkTarget="_blank"
                            remarkPlugins={[remarkGfm, supersub]}
                            children={
                              SANITIZE_ANSWER
                                ? DOMPurify.sanitize(answer.content, { ALLOWED_TAGS: XSSAllowTags })
                                : answer.content
                            }
                            className={styles.answerText}
                            components={components}
                          />
                        </div>
                      </div>
                    ) : answer.role === 'assistant' ? (
                      <div className={styles.chatMessageGpt}>
                        <Answer
                          answer={{
                            answer: answer.content,
                            citations: parseCitationFromMessage(messages[index - 1]),
                            message_id: answer.id,
                            feedback: answer.feedback
                          }}
                          onCitationClicked={c => onShowCitation(c)}
                          onRegenerateClicked={() => { reformulateAnswer(index - 2, answer.id) }}
                        />
                      </div>
                    ) : answer.role === ERROR ? (
                      <div className={styles.chatMessageError}>
                        <Stack horizontal className={styles.chatMessageErrorContent}>
                          <ErrorCircleRegular className={styles.errorIcon} style={{ color: 'rgba(182, 52, 67, 1)' }} />
                          <span>Error</span>
                        </Stack>
                        <span className={styles.chatMessageErrorContent}>{answer.content}</span>
                      </div>
                    ) : null}
                  </>
                ))}
                {showLoadingMessage && (
                  <>
                    <div className={styles.chatMessageGpt}>
                      <Answer
                        answer={{
                          answer: 'Generating answer...',
                          citations: []
                        }}
                        onCitationClicked={() => null}
                      />
                    </div>
                  </>
                )}
                <div ref={chatMessageStreamEnd} />
              </div>
            )}

            <Stack horizontal className={styles.chatInput}>
              <Stack>
                {isLoading && (
                  <Stack
                    horizontal
                    className={styles.stopGeneratingContainer}
                    role="button"
                    aria-label="Stop generating"
                    tabIndex={0}
                    onClick={stopGenerating}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ' ? stopGenerating() : null)}>
                    <SquareRegular className={styles.stopGeneratingIcon} aria-hidden="true" />
                    <span className={styles.stopGeneratingText} aria-hidden="true">
                      Stop generating
                    </span>
                  </Stack>
                )}
              </Stack>
              <Stack className={styles.chatButtons}>
                {appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured && (
                  <CommandBarButton
                    role="button"
                    styles={{
                      icon: {
                        color: '#FFFFFF'
                      },
                      iconDisabled: {
                        color: '#BDBDBD !important'
                      },
                      root: {
                        color: '#FFFFFF',
                        background:
                          'radial-gradient(109.81% 107.82% at 100.1% 90.19%, #0F6CBD 33.63%, #2D87C3 70.31%, #8DDDD8 100%)'
                      },
                      rootDisabled: {
                        background: '#F0F0F0'
                      }
                    }}
                    className={styles.newChatIcon}
                    iconProps={{ iconName: 'Add' }}
                    onClick={newChat}
                    disabled={disabledButton()}
                    aria-label="start a new chat button"
                  />
                )}
                {ui?.show_upload_button && (
                  <>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      id="file-upload"
                    />
                    {selectedImage == null && fileName == null ? (
                      <CommandBarButton
                        iconProps={{ iconName: 'Add' }}
                        onClick={() => document.getElementById('file-upload')?.click()}
                        styles={{
                          icon: {
                            color: '#FFFFFF'
                          },
                          iconDisabled: {
                            color: '#BDBDBD !important'
                          },
                          root: {
                            color: '#FFFFFF',
                            background:
                              'radial-gradient(109.81% 107.82% at 100.1% 90.19%, #0F6CBD 33.63%, #2D87C3 70.31%, #8DDDD8 100%)'
                          },
                          rootDisabled: {
                            background: '#F0F0F0'
                          }
                        }}
                        className={styles.clearChatBroom}
                        aria-label="upload file button"
                      />
                    ) : (
                      <CommandBarButton
                        iconProps={{ iconName: 'Clear' }}
                        onClick={() => {
                          setSelectedImage(null);
                          setSelectedFile(null);
                          setFileName(null);
                        }}
                        styles={{
                          icon: {
                            color: '#FFFFFF'
                          },
                          iconDisabled: {
                            color: '#BDBDBD !important'
                          },
                          root: {
                            color: '#FFFFFF',
                            background:
                              'radial-gradient(109.81% 107.82% at 100.1% 90.19%, #0F6CBD 33.63%, #2D87C3 70.31%, #8DDDD8 100%)'
                          },
                          rootDisabled: {
                            background: '#F0F0F0'
                          }
                        }}
                        className={styles.clearChatBroom}
                        aria-label="upload clear button"
                      />
                    )}
                  </>
                )}
                <CommandBarButton
                  role="button"
                  styles={{
                    icon: {
                      color: '#FFFFFF'
                    },
                    iconDisabled: {
                      color: '#BDBDBD !important'
                    },
                    root: {
                      color: '#FFFFFF',
                      background:
                        'radial-gradient(109.81% 107.82% at 100.1% 90.19%, #0F6CBD 33.63%, #2D87C3 70.31%, #8DDDD8 100%)'
                    },
                    rootDisabled: {
                      background: '#F0F0F0'
                    }
                  }}
                  className={
                    appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured
                      ? styles.clearChatBroom
                      : styles.clearChatBroomNoCosmos
                  }
                  iconProps={{ iconName: 'Broom' }}
                  onClick={
                    appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured
                      ? clearChat
                      : newChat
                  }
                  disabled={disabledButton()}
                  aria-label="clear chat button"
                />
                <Dialog
                  hidden={hideErrorDialog}
                  onDismiss={handleErrorDialogClose}
                  dialogContentProps={errorDialogContentProps}
                  modalProps={modalProps}></Dialog>
              </Stack>
              <QuestionInput
                clearOnSend
                placeholder="Type a new question..."
                selectedImage={selectedImage}
                selectedFile={selectedFile}
                fileName={fileName}
                disabled={isLoading}
                onSend={(question, id) => {
                  appStateContext?.state.isCosmosDBAvailable?.cosmosDB && selectedImage == null
                    ? makeApiRequestWithCosmosDB(question, id)
                    : makeApiRequestWithoutCosmosDB(question, id)
                }}
                conversationId={
                  appStateContext?.state.currentChat?.id ? appStateContext?.state.currentChat?.id : undefined
                }
              />
            </Stack>
          </div>
          {/* Citation Panel */}
          {messages && messages.length > 0 && isCitationPanelOpen && activeCitation && (
            <Stack.Item className={styles.citationPanel} tabIndex={0} role="tabpanel" aria-label="Citations Panel">
              <Stack
                aria-label="Citations Panel Header Container"
                horizontal
                className={styles.citationPanelHeaderContainer}
                horizontalAlign="space-between"
                verticalAlign="center">
                <span aria-label="Citations" className={styles.citationPanelHeader}>
                  Citations
                </span>
                <IconButton
                  iconProps={{ iconName: 'Cancel' }}
                  aria-label="Close citations panel"
                  onClick={() => setIsCitationPanelOpen(false)}
                />
              </Stack>
              <h5
                className={styles.citationPanelTitle}
                tabIndex={0}
                title={
                  activeCitation.url && !activeCitation.url.includes('blob.core')
                    ? activeCitation.url
                    : activeCitation.title ?? ''
                }
                onClick={() => onViewSource(activeCitation)}>
                {activeCitation.title}
              </h5>
              <div tabIndex={0}>
                <ReactMarkdown
                  linkTarget="_blank"
                  className={styles.citationPanelContent}
                  children={DOMPurify.sanitize(activeCitation.content, { ALLOWED_TAGS: XSSAllowTags })}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                />
              </div>
            </Stack.Item>
          )}
          {appStateContext?.state.isChatHistoryOpen &&
            appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured && <ChatHistoryPanel />}
        </Stack>
      )}
      <div className={styles.linkContainer}>
        <a href="https://daiichisankyoeurope.sharepoint.com/sites/team2457/Documents/dsGPT%20Key%20Principles_EN.pdf?web=1" target="_blank" rel="noopener noreferrer">dsGPT Key Priciples EN</a>
        <a href="https://daiichisankyoeurope.sharepoint.com/sites/team2457/Documents/dsGPT%20Key%20Principles_DE.pdf?web=1" target="_blank" rel="noopener noreferrer">dsGPT Key Priciples DE</a>
        <a href="https://daiichisankyoeurope.sharepoint.com/sites/team2457/Documents/dsGPT-Terms_Conditions.pdf?web=1" target="_blank" rel="noopener noreferrer">Terms & Conditions</a>
      </div>
    </div>
  )
}

export default withAITracking(reactPlugin, Chat, 'Chat', styles.containerNoGap);

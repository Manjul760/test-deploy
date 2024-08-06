import {Express} from "express"
import { userPath } from "./Table/Entities/User";
import { loginLogoutPaths } from "./loginlogout/LoginLogout";
import { userRateUserPaths } from "./Table/Relation/UserRatesUser";
import { itemPaths } from "./Table/Entities/Item";
import { userReportUserPaths } from "./Table/Relation/UserReportUser";
import { userMessageUserPaths } from "./Table/Relation/UserMessageUser";
import { userRequestItemPaths } from "./Table/Relation/UserRequestsItem";
import { userCommentsItemPaths } from "./Table/Relation/UserCommentsItem";
import { userReportsItemPaths } from "./Table/Relation/UserReportsItem";
import { userReportAdminPaths } from "./Table/Relation/UserReportsAdmin";
import { signupFlow } from "./Flows/SignupFlow";
import { passwordChangeByEmail } from "./Flows/PasswordChangeByEmailFlow";
import { homePageDisplayPaths } from "./Display/HomePage";
import { itemPageDisplayPaths } from "./Display/ItemPage";
import { userCommentsCommentPaths } from "./Table/Relation/UserCommentsOnComment";
import { postedItemsDisplayPaths } from "./Display/PostedItem";
import { myRequestListPageDisplayPaths } from "./Display/MyReqestList";
import { messagePageDisplayPaths } from "./Display/Message";
import { notificationPageDisplayPaths } from "./Display/Notifictions";
import { userNotificationPath } from "./Table/Entities/UserNotification";
import { profilePageDisplayPaths } from "./Display/Profile";
import { feedbackPath } from "./Table/Entities/Feedback";
import { adminPageDisplayPaths } from "./Display/AdminPage";
import { careerPaths } from "./Table/Entities/Career";
import { careerPageDisplayPaths } from "./Display/CareerPage";


type FunctionList = (app:Express)=>void

export const websitePaths:FunctionList[] = [
    signupFlow,
    passwordChangeByEmail,

    loginLogoutPaths,

    userReportAdminPaths,

    feedbackPath,

    careerPaths,

    userPath,
    userRateUserPaths,
    userReportUserPaths,
    userMessageUserPaths,
  
    careerPageDisplayPaths,

    itemPaths,
    userRequestItemPaths,
    userCommentsItemPaths,
    userReportsItemPaths,
    
    userCommentsCommentPaths,

    userNotificationPath,
    
    adminPageDisplayPaths,
    profilePageDisplayPaths,
    notificationPageDisplayPaths,
    messagePageDisplayPaths,
    myRequestListPageDisplayPaths,
    postedItemsDisplayPaths,
    homePageDisplayPaths,
    itemPageDisplayPaths,
]
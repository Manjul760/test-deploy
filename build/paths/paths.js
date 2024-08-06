"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websitePaths = void 0;
const User_1 = require("./Table/Entities/User");
const LoginLogout_1 = require("./loginlogout/LoginLogout");
const UserRatesUser_1 = require("./Table/Relation/UserRatesUser");
const Item_1 = require("./Table/Entities/Item");
const UserReportUser_1 = require("./Table/Relation/UserReportUser");
const UserMessageUser_1 = require("./Table/Relation/UserMessageUser");
const UserRequestsItem_1 = require("./Table/Relation/UserRequestsItem");
const UserCommentsItem_1 = require("./Table/Relation/UserCommentsItem");
const UserReportsItem_1 = require("./Table/Relation/UserReportsItem");
const UserReportsAdmin_1 = require("./Table/Relation/UserReportsAdmin");
const SignupFlow_1 = require("./Flows/SignupFlow");
const PasswordChangeByEmailFlow_1 = require("./Flows/PasswordChangeByEmailFlow");
const HomePage_1 = require("./Display/HomePage");
const ItemPage_1 = require("./Display/ItemPage");
const UserCommentsOnComment_1 = require("./Table/Relation/UserCommentsOnComment");
const PostedItem_1 = require("./Display/PostedItem");
const MyReqestList_1 = require("./Display/MyReqestList");
const Message_1 = require("./Display/Message");
const Notifictions_1 = require("./Display/Notifictions");
const UserNotification_1 = require("./Table/Entities/UserNotification");
const Profile_1 = require("./Display/Profile");
const Feedback_1 = require("./Table/Entities/Feedback");
const AdminPage_1 = require("./Display/AdminPage");
const Career_1 = require("./Table/Entities/Career");
const CareerPage_1 = require("./Display/CareerPage");
exports.websitePaths = [
    SignupFlow_1.signupFlow,
    PasswordChangeByEmailFlow_1.passwordChangeByEmail,
    LoginLogout_1.loginLogoutPaths,
    UserReportsAdmin_1.userReportAdminPaths,
    Feedback_1.feedbackPath,
    Career_1.careerPaths,
    User_1.userPath,
    UserRatesUser_1.userRateUserPaths,
    UserReportUser_1.userReportUserPaths,
    UserMessageUser_1.userMessageUserPaths,
    CareerPage_1.careerPageDisplayPaths,
    Item_1.itemPaths,
    UserRequestsItem_1.userRequestItemPaths,
    UserCommentsItem_1.userCommentsItemPaths,
    UserReportsItem_1.userReportsItemPaths,
    UserCommentsOnComment_1.userCommentsCommentPaths,
    UserNotification_1.userNotificationPath,
    AdminPage_1.adminPageDisplayPaths,
    Profile_1.profilePageDisplayPaths,
    Notifictions_1.notificationPageDisplayPaths,
    Message_1.messagePageDisplayPaths,
    MyReqestList_1.myRequestListPageDisplayPaths,
    PostedItem_1.postedItemsDisplayPaths,
    HomePage_1.homePageDisplayPaths,
    ItemPage_1.itemPageDisplayPaths,
];

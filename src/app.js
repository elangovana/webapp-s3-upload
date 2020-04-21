"use strict";
// Customise step 1: configure the bucket and cognito pool 

var bucketName = "covid-ecmo-docs-ap-southeast-2";
var bucketRegion = "ap-southeast-2";
var identityPoolId = "ap-southeast-2:d608f0b4-a06c-4f72-b9b3-99ce5e2c1fce";
var iamRoleForBucketAccess="arn:aws:iam::676848263516:role/ecmocard_scan_upload_cognito";
var accountId = "676848263516";
var cognitoUserPoolId = 'cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_lxN1tk00C';




function userLoggedIn(token) {
    AWS.config.update({
        region: bucketRegion
    });
    
    
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        AccountId: accountId,
        IdentityPoolId: identityPoolId
    });

    var creds = AWS.config.credentials;
    creds.params.RoleArn = iamRoleForBucketAccess;

    var loginParams = {}
    loginParams[cognitoUserPoolId] = token
    creds.params.Logins = loginParams


    AWS.config.update({
        credentials: creds
    });



    // Expire credentials to refresh them on the next request
    creds.expired = true;

}

var s3 = new AWS.S3({
    apiVersion: "2006-03-01",
    params: { Bucket: bucketName }
});



function addDocument(documentType, fileObjId, spinnerObjId) {
    var files = document.getElementById(fileObjId).files;
    if (!files.length) {
        return alert("Please choose a file to upload first.");
    }
    var spinner = document.getElementById(spinnerObjId)
    spinner.innerText = "Uploading " + files[0].name + ". Please wait ...."


   
    var uploadToS3 = function (file, fileName, userIdentity) {
        var documentTypeKey = encodeURIComponent(documentType) + "/";
        var datetime = (new Date()).toISOString().replace(/-/g, "").replace(/:/g, "").replace("T", "").replace(".", "_");
    
        var documentKey = documentTypeKey + userIdentity + "/" + datetime + "_" + fileName;
        console.log(documentKey)

        // Use S3 ManagedUpload class as it supports multipart uploads
        var upload = new AWS.S3.ManagedUpload({
            params: {
                Bucket: bucketName,
                Key: documentKey,
                Body: file
            }
        });

        var promise = upload.promise();

        promise.then(
            function (data) {
                alert("Successfully uploaded document.");
                spinner.innerText = ""
            },
            function (err) {
                console.log(err)
                console.log(AWS.config.credentials)
                spinner.innerText = ""

                return alert("There was an error uploading your document: " + err.message);
            }
        );
    }

    AWS.config.credentials.get(function (err) {
        var userIdentity = "unknown"

        console.log("running get credentials....")
        if (!err) {
            userIdentity = AWS.config.credentials.identityId.replace(":", "_");
            
        }
        else {
            console.log(err)
        }
        var file = files[0]
        uploadToS3(file, file.name, userIdentity)

    });



}

function deletePhoto(albumName, photoKey) {
    s3.deleteObject({ Key: photoKey }, function (err, data) {
        if (err) {
            return alert("There was an error deleting your photo: ", err.message);
        }
        alert("Successfully deleted photo.");
        viewAlbum(albumName);
    });
}
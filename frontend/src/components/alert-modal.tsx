"use client";

import * as React from "react"
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "./ui/dialog";

export function AlertModal({
    isOpen,
    onClose,
    title = "Default Title",
    description = "Default Description",
    buttonText = "",
    secondaryButtonText = "",
    onPrimaryButtonClick = () => { },
    onSecondaryButtonClick = () => { },
    closeOnOutsideClick = false
}) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent 
                className="alert-modal"
                onPointerDownOutside={closeOnOutsideClick ? undefined : (e) => e.preventDefault()}
            >
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>

                <div className="flex flex-col justify-center items-center">
                    {
                        buttonText && (
                            <Button
                                
                                className="rounded-full w-full mt-2"
                                onClick={onPrimaryButtonClick}
                                variant="primaryOutline"
                            >
                                {buttonText}
                            </Button>
                        )
                    }
                    {
                        secondaryButtonText && (
                            <Button
                                
                                className="rounded-full w-full mt-2"
                                onClick={onSecondaryButtonClick}
                            >
                                {secondaryButtonText}
                            </Button>
                        )
                    }

                </div>
            </DialogContent>
        </Dialog>
    )
}

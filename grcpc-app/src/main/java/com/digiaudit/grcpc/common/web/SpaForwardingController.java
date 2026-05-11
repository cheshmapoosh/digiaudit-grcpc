package com.digiaudit.grcpc.common.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaForwardingController {

    @RequestMapping(value = {
            "/{path:^(?!api$)[^\\.]*}",
            "/**/{path:^(?!api$)[^\\.]*}"
    })
    public String forward() {
        return "forward:/index.html";
    }
}

